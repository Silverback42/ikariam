#!/usr/bin/env python3
"""Ermittelt neu inaktive Ikariam-Spieler über ika-map.com und erstellt eine Plünderliste.

Ablauf pro Lauf:
  1. Inaktiven-Liste von ika-map.com laden (oder eine gespeicherte HTML-Datei lesen).
  2. Tabelle parsen (Spieler, Allianz, Stadt, Koordinaten, ...).
  3. Mit dem letzten Stand in der SQLite-Datenbank vergleichen:
     - neu aufgetauchte Einträge = "gerade inaktiv geworden"
     - verschwundene Einträge    = wieder aktiv / gelöscht
  4. Plünderliste (CSV + HTML) erzeugen, sortiert nach "neu" und Entfernung zu deinen Städten.

Das Tool greift NICHT ins Spiel ein. Angriffe schickst du selbst ab
(Bots/Automatisierung im Spiel verstoßen gegen die Gameforge-Regeln).
"""

import argparse
import csv
import html
import json
import math
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.ika-map.com/inactives"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# Spaltenüberschriften (klein geschrieben) -> internes Feld. Erste passende Regel gewinnt.
HEADER_RULES = [
    ("alliance", ("allianz", "alliance", "ally")),
    ("city", ("stadt", "city", "town", "polis")),
    ("island", ("insel", "island")),
    ("player", ("spieler", "player", "name")),
    ("coords", ("koord", "coord", "position", "pos")),
    ("level", ("rathaus", "town hall", "level", "stufe", "größe", "size")),
    ("score", ("punkte", "score", "points", "gesamt")),
]

COORD_RE = re.compile(r"\[?\s*(\d{1,3})\s*[:|,;]\s*(\d{1,3})\s*\]?")


def classify_header(text):
    t = text.strip().lower()
    for field, keywords in HEADER_RULES:
        if any(k in t for k in keywords):
            return field
    return None


def parse_coords(text):
    m = COORD_RE.search(text or "")
    if not m:
        return None
    x, y = int(m.group(1)), int(m.group(2))
    if 1 <= x <= 100 and 1 <= y <= 100:
        return x, y
    return None


def parse_score(text):
    """'2.345.678' / '2,345,678' / '2,3 Mio' / '2.3M' -> int, sonst None."""
    t = (text or "").strip().lower().replace("\xa0", " ")
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(mio|m\b|mill)", t)
    if m:
        return int(round(float(m.group(1).replace(",", ".")) * 1_000_000))
    m = re.search(r"\d{1,3}(?:[.,' ]\d{3})+|\d+", t)
    if not m:
        return None
    return int(re.sub(r"\D", "", m.group(0)))


RESOURCES = {
    "wood": ("baumaterial", "holz", "wood", "building material"),
    "wine": ("wein", "wine"),
    "marble": ("marmor", "marble"),
    "crystal": ("kristallglas", "kristall", "crystal glass", "crystal"),
    "sulfur": ("schwefel", "sulfur", "sulphur"),
}
RESOURCE_LABELS = {"wood": "Baumaterial", "wine": "Wein", "marble": "Marmor", "crystal": "Kristall", "sulfur": "Schwefel"}


def parse_spy_report(text):
    """Liest Rohstoffmengen aus einem eingefügten Spionagebericht.

    Sucht je Rohstoff den Namen und nimmt die erste Zahl danach (gleiche oder nächste Zeile).
    Gibt {rohstoff: menge} nur für gefundene Rohstoffe zurück.
    """
    lines = [" ".join(l.split()) for l in (text or "").splitlines()]
    lines = [l for l in lines if l]
    found = {}
    for i, line in enumerate(lines):
        low = line.lower()
        for res, names in RESOURCES.items():
            if res in found:
                continue
            for name in names:
                pos = low.find(name)
                if pos < 0:
                    continue
                rest = line[pos + len(name):]
                nxt = lines[i + 1] if i + 1 < len(lines) else ""
                for candidate in (rest, nxt):
                    m = re.search(r"\d{1,3}(?:[.,' ]\d{3})+|\d+", candidate)
                    if m:
                        found[res] = int(re.sub(r"\D", "", m.group(0)))
                        break
                break
    return found


def estimate_loot(resources, safe_amount, ship_capacity):
    """Plünderbare Menge = Summe (Bestand - sicherer Bestand), Schiffe = aufgerundet."""
    loot = sum(max(0, v - safe_amount) for v in resources.values())
    ships = math.ceil(loot / ship_capacity) if ship_capacity else 0
    return loot, ships


def cell_text(cell):
    return " ".join(cell.get_text(" ", strip=True).split())


def parse_inactives(page_html):
    """Gibt eine Liste von Dicts (eine pro Zeile der größten Tabelle) zurück."""
    soup = BeautifulSoup(page_html, "html.parser")
    tables = soup.find_all("table")
    if not tables:
        return []
    table = max(tables, key=lambda t: len(t.find_all("tr")))
    rows = table.find_all("tr")

    header_cells = table.select("thead tr th") or rows[0].find_all(["th", "td"])
    headers = [cell_text(c) or f"col{i}" for i, c in enumerate(header_cells)]
    fields = [classify_header(h) for h in headers]

    results = []
    for tr in rows:
        cells = tr.find_all("td")
        if not cells or tr.find_parent("thead") is not None:
            continue
        texts = [cell_text(c) for c in cells]
        raw = {headers[i] if i < len(headers) else f"col{i}": t for i, t in enumerate(texts)}
        entry = {"player": "", "alliance": "", "city": "", "island": "", "score": "", "level": "", "x": None, "y": None}
        for i, t in enumerate(texts):
            field = fields[i] if i < len(fields) else None
            if field and not entry.get(field):
                entry[field] = t
        # Koordinaten: bevorzugt aus der Koordinaten-Spalte, sonst aus jeder Zelle/jedem Link.
        coords = parse_coords(entry.pop("coords", ""))
        if coords is None:
            for c in cells:
                coords = parse_coords(cell_text(c))
                if coords is None:
                    for a in c.find_all("a", href=True):
                        m = re.search(r"[xX](?:coord)?=(\d+).*?[yY](?:coord)?=(\d+)", a["href"])
                        if m:
                            coords = (int(m.group(1)), int(m.group(2)))
                            break
                if coords:
                    break
        if coords:
            entry["x"], entry["y"] = coords
        if not entry["player"]:
            entry["player"] = texts[0]
        entry["raw"] = raw
        results.append(entry)
    return results


def fetch_page(cfg, page=None):
    params = {
        "searchType": "player",
        "server": cfg["server"],
        "world": cfg["world"],
        "searchInput1": "", "searchInput2": "", "searchInput3": "", "searchInput4": "", "searchInput5": "",
    }
    params.update(cfg.get("extra_params", {}))
    if page is not None and cfg.get("page_param"):
        params[cfg["page_param"]] = page
    resp = requests.get(BASE_URL, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(
            f"ika-map antwortet mit HTTP {resp.status_code}. Seite im Browser öffnen, "
            "mit Strg+S speichern und mit --html-file DATEI erneut starten."
        )
    return resp.text


def fetch_all(cfg):
    if not cfg.get("page_param"):
        return parse_inactives(fetch_page(cfg))
    entries, seen = [], set()
    for page in range(cfg.get("first_page", 1), cfg.get("first_page", 1) + cfg.get("max_pages", 20)):
        page_entries = parse_inactives(fetch_page(cfg, page))
        new = [e for e in page_entries if entry_key(e) not in seen]
        if not new:
            break
        seen.update(entry_key(e) for e in new)
        entries.extend(new)
    return entries


def entry_key(e):
    return f"{e['player']}|{e['city']}|{e['x']}:{e['y']}"


def open_db(path):
    db = sqlite3.connect(path)
    db.execute(
        """CREATE TABLE IF NOT EXISTS targets (
            key TEXT PRIMARY KEY, player TEXT, alliance TEXT, city TEXT, island TEXT,
            score TEXT, level TEXT, x INTEGER, y INTEGER, raw TEXT,
            first_seen TEXT, last_seen TEXT, active INTEGER DEFAULT 1,
            plundered_at TEXT, note TEXT, from_baseline INTEGER DEFAULT 0)"""
    )
    db.execute("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)")
    db.execute(
        """CREATE TABLE IF NOT EXISTS spy_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT, target_key TEXT, created_at TEXT,
            wood INTEGER, wine INTEGER, marble INTEGER, crystal INTEGER, sulfur INTEGER, raw TEXT)"""
    )
    cols = {r[1] for r in db.execute("PRAGMA table_info(targets)")}
    if "score_num" not in cols:
        db.execute("ALTER TABLE targets ADD COLUMN score_num INTEGER")
        for key, score in db.execute("SELECT key, score FROM targets").fetchall():
            db.execute("UPDATE targets SET score_num=? WHERE key=?", (parse_score(score), key))
        db.commit()
    return db


def get_settings(db, defaults):
    row = db.execute("SELECT v FROM meta WHERE k='settings'").fetchone()
    cfg = dict(defaults)
    if row:
        cfg.update(json.loads(row[0]))
    return cfg


def save_settings(db, cfg):
    db.execute("INSERT INTO meta (k, v) VALUES ('settings', ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
               (json.dumps(cfg, ensure_ascii=False),))
    db.commit()


def get_meta(db, k):
    row = db.execute("SELECT v FROM meta WHERE k=?", (k,)).fetchone()
    return row[0] if row else None


def set_meta(db, k, v):
    db.execute("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, v))
    db.commit()


def save_spy_report(db, target_key, text, now):
    res = parse_spy_report(text)
    if not res:
        return None
    db.execute(
        "INSERT INTO spy_reports (target_key, created_at, wood, wine, marble, crystal, sulfur, raw) VALUES (?,?,?,?,?,?,?,?)",
        (target_key, now, *(res.get(r) for r in RESOURCES), text),
    )
    db.commit()
    return res


def latest_spy(db, target_key):
    row = db.execute(
        "SELECT created_at, wood, wine, marble, crystal, sulfur FROM spy_reports "
        "WHERE target_key=? ORDER BY id DESC LIMIT 1", (target_key,)
    ).fetchone()
    if not row:
        return None
    return {"created_at": row[0], "resources": {r: v for r, v in zip(RESOURCES, row[1:]) if v is not None}}


def baseline(db):
    """Zeitpunkt des ersten Laufs: alles, was dort schon inaktiv war, gilt nicht als 'neu'."""
    row = db.execute("SELECT v FROM meta WHERE k='baseline'").fetchone()
    return row[0] if row else None


def update_db(db, entries, now):
    """Speichert den aktuellen Stand. Gibt (neu, verschwunden) als Listen von Keys zurück."""
    known = {k: a for k, a in db.execute("SELECT key, active FROM targets")}
    current = {entry_key(e): e for e in entries}
    first_run = baseline(db) is None
    if first_run:
        db.execute("INSERT INTO meta (k, v) VALUES ('baseline', ?)", (now,))
    new_keys = []
    for key, e in current.items():
        if key not in known or not known[key]:
            new_keys.append(key)
            db.execute(
                """INSERT INTO targets (key, player, alliance, city, island, score, level, x, y, raw,
                                          first_seen, last_seen, active, from_baseline, score_num)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)
                   ON CONFLICT(key) DO UPDATE SET active=1, from_baseline=0,
                       first_seen=excluded.first_seen, last_seen=excluded.last_seen, score_num=excluded.score_num""",
                (key, e["player"], e["alliance"], e["city"], e["island"], e["score"], e["level"],
                 e["x"], e["y"], json.dumps(e["raw"], ensure_ascii=False), now, now, int(first_run),
                 parse_score(e["score"])),
            )
        else:
            db.execute(
                "UPDATE targets SET alliance=?, score=?, score_num=?, level=?, raw=?, last_seen=? WHERE key=?",
                (e["alliance"], e["score"], parse_score(e["score"]), e["level"],
                 json.dumps(e["raw"], ensure_ascii=False), now, key),
            )
    gone = [k for k, a in known.items() if a and k not in current]
    db.executemany("UPDATE targets SET active=0 WHERE key=?", [(k,) for k in gone])
    db.commit()
    return ([] if first_run else new_keys), gone


def distance(x, y, own_cities):
    if x is None or not own_cities:
        return None
    return min(math.hypot(x - c["x"], y - c["y"]) for c in own_cities)


def build_list(db, cfg, now):
    own = cfg.get("own_cities", [])
    max_dist = cfg.get("max_distance")
    new_hours = cfg.get("new_hours", 24)
    cooldown = cfg.get("plunder_cooldown_hours", 0)
    threshold = (datetime.fromisoformat(now) - timedelta(hours=new_hours)).isoformat()
    exclude_alliances = {a.lower() for a in cfg.get("exclude_alliances", [])}
    min_score = cfg.get("min_score") or 0
    safe_amount = cfg.get("safe_amount", 0)
    ship_capacity = cfg.get("ship_capacity", 500)

    rows = []
    for r in db.execute(
        "SELECT key, player, alliance, city, island, score, level, x, y, first_seen, plundered_at, note, "
        "from_baseline, score_num FROM targets WHERE active=1"
    ).fetchall():
        (key, player, alliance, city, island, score, level, x, y,
         first_seen, plundered_at, note, from_baseline, score_num) = r
        if alliance and alliance.lower() in exclude_alliances:
            continue
        # Unbekannte Punktzahl bleibt drin, damit Parser-Probleme sichtbar statt still gefiltert sind.
        if min_score and score_num is not None and score_num < min_score:
            continue
        d = distance(x, y, own)
        if max_dist is not None and d is not None and d > max_dist:
            continue
        ready = True
        if plundered_at and cooldown:
            ready = datetime.fromisoformat(plundered_at) + timedelta(hours=cooldown) <= datetime.fromisoformat(now)
        spy = latest_spy(db, key)
        loot, ships = estimate_loot(spy["resources"], safe_amount, ship_capacity) if spy else (None, None)
        rows.append({
            "neu": not from_baseline and first_seen >= threshold,
            "spieler": player, "allianz": alliance, "stadt": city, "insel": island,
            "koordinaten": f"[{x}:{y}]" if x is not None else "",
            "entfernung": round(d, 1) if d is not None else "",
            "punkte": score, "rathaus": level,
            "inaktiv_erkannt": first_seen[:16].replace("T", " "),
            "geplündert": (plundered_at or "")[:16].replace("T", " "),
            "bereit": ready, "notiz": note or "", "key": key,
            "punkte_num": score_num, "x": x, "y": y,
            "spionage": spy["created_at"][:16].replace("T", " ") if spy else "",
            "rohstoffe": spy["resources"] if spy else {},
            "beute": loot if loot is not None else "", "schiffe": ships if ships is not None else "",
        })
    rows.sort(key=lambda r: (not r["neu"], not r["bereit"], -(r["beute"] or 0),
                             r["entfernung"] if r["entfernung"] != "" else 1e9, r["spieler"].lower()))
    return rows


COLUMNS = ["neu", "bereit", "spieler", "allianz", "stadt", "insel", "koordinaten",
           "entfernung", "punkte", "rathaus", "beute", "schiffe", "spionage", "inaktiv_erkannt", "geplündert", "notiz"]


def write_csv(rows, path):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, delimiter=";", extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({**r, "neu": "ja" if r["neu"] else "", "bereit": "ja" if r["bereit"] else "nein"})


def write_html(rows, path, cfg, now):
    def td(v):
        return f"<td>{html.escape(str(v))}</td>"
    body = []
    for r in rows:
        cls = " ".join(c for c, on in (("new", r["neu"]), ("wait", not r["bereit"])) if on)
        cells = "".join(td("NEU" if c == "neu" and r[c] else ("" if c == "neu" else
                        ("ja" if r[c] else "nein") if c == "bereit" else r[c])) for c in COLUMNS)
        body.append(f'<tr class="{cls}">{cells}</tr>')
    own = ", ".join(f"{c.get('name', '')} [{c['x']}:{c['y']}]" for c in cfg.get("own_cities", []))
    doc = f"""<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Plünderliste Welt {cfg['world']}</title>
<style>
body{{font-family:system-ui,sans-serif;margin:16px;background:#faf7f0;color:#222}}
table{{border-collapse:collapse;width:100%;font-size:14px}}
th,td{{border:1px solid #ddd;padding:4px 8px;text-align:left}} th{{background:#e9e1cc;position:sticky;top:0}}
tr.new td{{background:#e5f6e0;font-weight:600}} tr.wait td{{color:#999}}
</style></head><body>
<h1>Plünderliste – Server {cfg['server']}, Welt {cfg['world']}</h1>
<p>Stand: {now[:16].replace('T', ' ')} UTC · {len(rows)} Ziele · {sum(r['neu'] for r in rows)} neu · Eigene Städte: {html.escape(own) or '–'}</p>
<table><thead><tr>{''.join(f'<th>{c}</th>' for c in COLUMNS)}</tr></thead><tbody>
{''.join(body)}
</tbody></table></body></html>"""
    Path(path).write_text(doc, encoding="utf-8")


def mark_plundered(db, player, note, now):
    cur = db.execute(
        "UPDATE targets SET plundered_at=?, note=COALESCE(?, note) WHERE lower(player)=lower(?) AND active=1",
        (now, note, player),
    )
    db.commit()
    return cur.rowcount


DEFAULTS = {
    "server": 2, "world": 72, "own_cities": [], "min_score": 2_000_000, "max_distance": None,
    "new_hours": 48, "plunder_cooldown_hours": 12, "exclude_alliances": [],
    "safe_amount": 0, "ship_capacity": 500, "refresh_hours": 3,
    "page_param": None, "max_pages": 20, "extra_params": {},
}


def load_config(path):
    cfg = dict(DEFAULTS)
    p = Path(path)
    if p.exists():
        cfg.update(json.loads(p.read_text(encoding="utf-8")))
    return cfg


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default="config.json", help="Konfigurationsdatei (Standard: config.json)")
    ap.add_argument("--db", default="ika_inactives.db", help="SQLite-Datenbank für den Verlauf")
    ap.add_argument("--html-file", help="Gespeicherte ika-map-Seite statt Download verwenden")
    ap.add_argument("--out", default="pluenderliste", help="Ausgabe-Präfix für .csv und .html")
    ap.add_argument("--mark", metavar="SPIELER", help="Spieler als geplündert markieren (kein Abruf)")
    ap.add_argument("--note", help="Notiz zu --mark, z. B. 'Mauer 5, viel Marmor'")
    args = ap.parse_args(argv)

    cfg = load_config(args.config)
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds")
    db = open_db(args.db)

    if args.mark:
        n = mark_plundered(db, args.mark, args.note, now)
        print(f"{n} Stadt/Städte von {args.mark} als geplündert markiert.")
        return 0 if n else 1

    if args.html_file:
        entries = parse_inactives(Path(args.html_file).read_text(encoding="utf-8", errors="replace"))
    else:
        entries = fetch_all(cfg)
    if not entries:
        print("Keine Tabelle/Einträge gefunden. Lädt die Seite die Daten per JavaScript nach? "
              "Dann Seite im Browser speichern und --html-file verwenden.", file=sys.stderr)
        return 2

    new_keys, gone = update_db(db, entries, now)
    rows = build_list(db, cfg, now)
    write_csv(rows, f"{args.out}.csv")
    write_html(rows, f"{args.out}.html", cfg, now)

    print(f"{len(entries)} inaktive Einträge gelesen, {len(new_keys)} neu inaktiv, {len(gone)} wieder aktiv/weg.")
    for r in rows:
        if r["neu"] and r["key"] in new_keys:
            print(f"  NEU  {r['spieler']:<20} {r['stadt']:<20} {r['koordinaten']:<9} Entf. {r['entfernung']}")
    print(f"Plünderliste: {args.out}.html / {args.out}.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
