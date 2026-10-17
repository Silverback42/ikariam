"""Web-App für die Plünderliste: läuft im Docker-Container, bedienbar vom Handy-Browser."""

import asyncio
import os
import secrets
import sys
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import ika_inactives as ika  # noqa: E402

BASE = Path(__file__).resolve().parent
DB_PATH = os.environ.get("IKA_DB", "/data/ika.db")
APP_USER = os.environ.get("APP_USER", "")
APP_PASSWORD = os.environ.get("APP_PASSWORD", "")
AUTO_REFRESH = os.environ.get("IKA_AUTO_REFRESH", "1") != "0"

DEFAULTS = {**ika.DEFAULTS,
            "server": int(os.environ.get("IKA_SERVER", ika.DEFAULTS["server"])),
            "world": int(os.environ.get("IKA_WORLD", ika.DEFAULTS["world"]))}

templates = Jinja2Templates(directory=str(BASE / "templates"))
templates.env.filters["num"] = lambda v: f"{v:,}".replace(",", ".") if isinstance(v, int) else (v or "")
templates.env.globals["labels"] = ika.RESOURCE_LABELS
refresh_lock = threading.Lock()
security = HTTPBasic(auto_error=False)


def now_iso():
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds")


def db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    return ika.open_db(DB_PATH)


def settings(conn):
    return ika.get_settings(conn, DEFAULTS)


def check_auth(creds: HTTPBasicCredentials | None = Depends(security)):
    if not APP_PASSWORD:
        return
    ok = creds is not None and secrets.compare_digest(creds.username, APP_USER) \
        and secrets.compare_digest(creds.password, APP_PASSWORD)
    if not ok:
        raise HTTPException(401, "Anmeldung nötig", headers={"WWW-Authenticate": "Basic"})


def refresh(page_html=None):
    """Inaktiven-Liste holen (oder hochgeladenes HTML lesen) und in der DB abgleichen."""
    with refresh_lock:
        conn = db()
        try:
            cfg = settings(conn)
            now = now_iso()
            try:
                entries = ika.parse_inactives(page_html) if page_html else ika.fetch_all(cfg)
                if not entries:
                    raise RuntimeError("Keine Tabelle auf der ika-map-Seite gefunden (Layout geändert oder JavaScript?).")
                new_keys, gone = ika.update_db(conn, entries, now)
                ika.set_meta(conn, "last_fetch", now)
                ika.set_meta(conn, "last_result",
                             f"{len(entries)} Inaktive gelesen, {len(new_keys)} neu, {len(gone)} wieder aktiv/weg")
                ika.set_meta(conn, "last_error", "")
            except Exception as exc:  # Fehler in der App anzeigen statt still zu scheitern
                ika.set_meta(conn, "last_error", f"{now[:16].replace('T', ' ')}: {exc}")
        finally:
            conn.close()


async def refresh_loop():
    while True:
        await asyncio.to_thread(refresh)
        conn = db()
        hours = float(settings(conn).get("refresh_hours") or 3)
        conn.close()
        await asyncio.sleep(max(hours, 0.25) * 3600)


@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(refresh_loop()) if AUTO_REFRESH else None
    yield
    if task:
        task.cancel()


app = FastAPI(lifespan=lifespan, dependencies=[Depends(check_auth)])
app.mount("/static", StaticFiles(directory=str(BASE / "static")), name="static")


def fmt_time(v):
    return (v or "")[:16].replace("T", " ")


@app.get("/health", include_in_schema=False)
def health():
    return {"ok": True}


@app.get("/", response_class=HTMLResponse)
def index(request: Request, filter: str = "all"):
    conn = db()
    try:
        cfg = settings(conn)
        rows = ika.build_list(conn, cfg, now_iso())
        total = conn.execute("SELECT COUNT(*) FROM targets WHERE active=1").fetchone()[0]
        status = {k: ika.get_meta(conn, k) or "" for k in ("last_fetch", "last_result", "last_error")}
    finally:
        conn.close()
    if filter == "new":
        rows = [r for r in rows if r["neu"]]
    elif filter == "ready":
        rows = [r for r in rows if r["bereit"]]
    return templates.TemplateResponse(request, "list.html", {
        "rows": rows, "total": total, "cfg": cfg, "filter": filter,
        "status": status, "last_fetch": fmt_time(status["last_fetch"]),
    })


def get_target(conn, key):
    row = conn.execute("SELECT key, player, city, x, y, score, note FROM targets WHERE key=?", (key,)).fetchone()
    if not row:
        raise HTTPException(404, "Ziel nicht gefunden")
    return dict(zip(("key", "player", "city", "x", "y", "score", "note"), row))


@app.get("/spy", response_class=HTMLResponse)
def spy_form(request: Request, key: str):
    conn = db()
    try:
        target = get_target(conn, key)
        last = ika.latest_spy(conn, key)
        cfg = settings(conn)
    finally:
        conn.close()
    return templates.TemplateResponse(request, "spy.html", {
        "t": target, "last": last, "preview": None, "text": "", "cfg": cfg, "fmt_time": fmt_time})


@app.post("/spy", response_class=HTMLResponse)
def spy_submit(request: Request, key: str = Form(...), text: str = Form(""), action: str = Form("preview")):
    conn = db()
    try:
        target = get_target(conn, key)
        cfg = settings(conn)
        if action == "save":
            if ika.save_spy_report(conn, key, text, now_iso()) is not None:
                return RedirectResponse("/", status_code=303)
        res = ika.parse_spy_report(text)
        loot, ships = ika.estimate_loot(res, cfg["safe_amount"], cfg["ship_capacity"])
        last = ika.latest_spy(conn, key)
    finally:
        conn.close()
    return templates.TemplateResponse(request, "spy.html", {
        "t": target, "last": last, "text": text, "cfg": cfg, "fmt_time": fmt_time,
        "preview": {"resources": res, "loot": loot, "ships": ships}})


@app.post("/plundered")
def plundered(key: str = Form(...), note: str = Form("")):
    conn = db()
    try:
        conn.execute("UPDATE targets SET plundered_at=?, note=COALESCE(NULLIF(?, ''), note) WHERE key=?",
                     (now_iso(), note.strip(), key))
        conn.commit()
    finally:
        conn.close()
    return RedirectResponse("/", status_code=303)


@app.post("/refresh")
async def refresh_now():
    await asyncio.to_thread(refresh)
    return RedirectResponse("/", status_code=303)


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    content = (await file.read()).decode("utf-8", errors="replace")
    await asyncio.to_thread(refresh, content)
    return RedirectResponse("/", status_code=303)


def parse_cities(text):
    cities = []
    for line in text.splitlines():
        coords = ika.parse_coords(line)
        if not coords:
            continue
        name = ika.COORD_RE.sub("", line).strip(" -:;,")
        cities.append({"name": name, "x": coords[0], "y": coords[1]})
    return cities


def to_num(v, cast=float):
    v = (v or "").strip().replace(",", ".")
    try:
        return cast(float(v)) if v else None
    except ValueError:
        return None


@app.get("/settings", response_class=HTMLResponse)
def settings_form(request: Request, saved: int = 0):
    conn = db()
    try:
        cfg = settings(conn)
    finally:
        conn.close()
    cities = "\n".join(f"{c.get('name', '')} [{c['x']}:{c['y']}]".strip() for c in cfg["own_cities"])
    return templates.TemplateResponse(request, "settings.html", {"cfg": cfg, "cities": cities, "saved": saved})


@app.post("/settings")
def settings_save(
    own_cities: str = Form(""), min_score_mio: str = Form(""), max_distance: str = Form(""),
    new_hours: str = Form(""), plunder_cooldown_hours: str = Form(""), safe_amount: str = Form(""),
    ship_capacity: str = Form(""), refresh_hours: str = Form(""), exclude_alliances: str = Form(""),
    server: str = Form(""), world: str = Form(""),
):
    conn = db()
    try:
        cfg = settings(conn)
        cfg.update({
            "own_cities": parse_cities(own_cities),
            "min_score": int((to_num(min_score_mio) or 0) * 1_000_000),
            "max_distance": to_num(max_distance),
            "new_hours": to_num(new_hours) or DEFAULTS["new_hours"],
            "plunder_cooldown_hours": to_num(plunder_cooldown_hours) or 0,
            "safe_amount": to_num(safe_amount, int) or 0,
            "ship_capacity": to_num(ship_capacity, int) or DEFAULTS["ship_capacity"],
            "refresh_hours": to_num(refresh_hours) or DEFAULTS["refresh_hours"],
            "exclude_alliances": [a.strip() for a in exclude_alliances.split(",") if a.strip()],
            "server": to_num(server, int) or cfg["server"],
            "world": to_num(world, int) or cfg["world"],
        })
        ika.save_settings(conn, cfg)
    finally:
        conn.close()
    return RedirectResponse("/settings?saved=1", status_code=303)
