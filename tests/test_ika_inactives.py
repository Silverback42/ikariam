import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import ika_inactives as ika


def page(rows):
    body = "".join(
        f"<tr><td>{p}</td><td>{a}</td><td>{c}</td><td><a href='#'>[{x}:{y}]</a></td><td>{s}</td></tr>"
        for p, a, c, x, y, s in rows
    )
    return ("<html><body><table><thead><tr><th>Spieler</th><th>Allianz</th><th>Stadt</th>"
            f"<th>Koordinaten</th><th>Punkte</th></tr></thead><tbody>{body}</tbody></table></body></html>")


class ParseTest(unittest.TestCase):
    def test_parses_columns_and_coords(self):
        e = ika.parse_inactives(page([("Alpha", "ABC", "Athen", 12, 34, "1.234")]))
        self.assertEqual(len(e), 1)
        self.assertEqual((e[0]["player"], e[0]["alliance"], e[0]["city"]), ("Alpha", "ABC", "Athen"))
        self.assertEqual((e[0]["x"], e[0]["y"]), (12, 34))

    def test_coords_from_link(self):
        h = ("<table><tr><th>Name</th><th>Insel</th></tr>"
             "<tr><td>Beta</td><td><a href='?view=island&xcoord=5&ycoord=77'>Foo</a></td></tr></table>")
        e = ika.parse_inactives(h)
        self.assertEqual((e[0]["x"], e[0]["y"]), (5, 77))


class FlowTest(unittest.TestCase):
    def test_new_and_gone_detection(self):
        cfg = {"server": 2, "world": 72, "own_cities": [{"x": 10, "y": 10}], "new_hours": 48}
        with tempfile.TemporaryDirectory() as d:
            db = ika.open_db(str(Path(d) / "t.db"))
            first = ika.parse_inactives(page([("Alt", "", "A", 11, 10, "1"), ("Weg", "", "W", 40, 40, "1")]))
            new, gone = ika.update_db(db, first, "2026-10-01T10:00:00")
            self.assertEqual((new, gone), ([], []))  # erster Lauf = Basislinie

            second = ika.parse_inactives(page([("Alt", "", "A", 11, 10, "1"), ("Frisch", "", "F", 13, 14, "1")]))
            new, gone = ika.update_db(db, second, "2026-10-01T16:00:00")
            self.assertEqual(len(new), 1)
            self.assertIn("Frisch", new[0])
            self.assertEqual(len(gone), 1)

            rows = ika.build_list(db, cfg, "2026-10-01T16:00:00")
            self.assertEqual([r["spieler"] for r in rows], ["Frisch", "Alt"])
            self.assertTrue(rows[0]["neu"])
            self.assertEqual(rows[0]["entfernung"], 5.0)

            self.assertEqual(ika.mark_plundered(db, "frisch", "Mauer 3", "2026-10-01T17:00:00"), 1)
            cfg["plunder_cooldown_hours"] = 12
            rows = ika.build_list(db, cfg, "2026-10-01T18:00:00")
            frisch = next(r for r in rows if r["spieler"] == "Frisch")
            self.assertFalse(frisch["bereit"])
            self.assertEqual(frisch["notiz"], "Mauer 3")


if __name__ == "__main__":
    unittest.main()
