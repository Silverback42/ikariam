import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from fastapi.testclient import TestClient  # noqa: E402

from tests.test_ika_inactives import page  # noqa: E402

SPY = """Spionagebericht
Baumaterial 120.000
Wein: 40.000
Marmor
80.500
Kristallglas 15.000
Schwefel 200"""


class AppTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ.update(IKA_DB=str(Path(self.tmp.name) / "t.db"), IKA_AUTO_REFRESH="0",
                          APP_USER="", APP_PASSWORD="")
        import app.main as m
        self.m = importlib.reload(m)
        self.c = TestClient(self.m.app)

    def tearDown(self):
        self.tmp.cleanup()

    def upload(self, rows):
        r = self.c.post("/upload", files={"file": ("p.html", page(rows), "text/html")})
        self.assertEqual(r.status_code, 200)

    def test_flow(self):
        self.c.post("/settings", data={"own_cities": "Haupt [10:10]\nZweit 40:40", "min_score_mio": "2",
                                       "safe_amount": "10000", "ship_capacity": "500"})
        r = self.c.get("/settings")
        self.assertIn("Haupt [10:10]", r.text)
        self.assertIn("Zweit [40:40]", r.text)

        self.upload([("Alt", "", "A", 11, 10, "3.000.000")])
        self.upload([("Alt", "", "A", 11, 10, "3.000.000"), ("Gross", "", "G", 41, 41, "5.400.321"),
                     ("Klein", "", "K", 12, 12, "900.000")])
        r = self.c.get("/")
        self.assertIn("Gross", r.text)
        self.assertNotIn("Klein", r.text)  # unter 2 Mio.
        self.assertIn("5.400.321", r.text)
        self.assertIn("NEU", r.text)
        self.assertIn("2 neu", r.text)  # Klein ist neu, aber unter dem Punktefilter

        key = "Gross|G|41:41"
        r = self.c.post("/spy", data={"key": key, "text": SPY, "action": "preview"})
        self.assertIn("Beute ca. <strong>215.500</strong>", r.text)  # 110k+30k+70.5k+5k+0
        self.assertIn("431 Schiffe", r.text)
        self.c.post("/spy", data={"key": key, "text": SPY, "action": "save"})
        r = self.c.get("/")
        self.assertIn("Beute ca. 215.500", r.text)

        self.c.post("/settings", data={"own_cities": "Haupt [10:10]", "min_score_mio": "2",
                                       "max_distance": "5", "plunder_cooldown_hours": "12"})
        r = self.c.get("/")
        self.assertNotIn("Gross", r.text)  # zu weit weg
        self.c.post("/plundered", data={"key": "Alt|A|11:10", "note": "Mauer 3"})
        r = self.c.get("/?filter=ready")
        self.assertNotIn(">Alt<", r.text)
        self.assertIn("Mauer 3", self.c.get("/").text)

    def test_fetch_error_is_shown(self):
        self.c.post("/upload", files={"file": ("p.html", "<html>nichts</html>", "text/html")})
        self.assertIn("Keine Tabelle", self.c.get("/").text)

    def test_basic_auth(self):
        os.environ.update(APP_USER="ika", APP_PASSWORD="geheim")
        m = importlib.reload(self.m)
        c = TestClient(m.app)
        self.assertEqual(c.get("/").status_code, 401)
        self.assertEqual(c.get("/", auth=("ika", "falsch")).status_code, 401)
        self.assertEqual(c.get("/", auth=("ika", "geheim")).status_code, 200)


if __name__ == "__main__":
    unittest.main()
