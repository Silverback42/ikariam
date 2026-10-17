# Ikariam – neu inaktive Spieler finden (ika-map.com)

`ika_inactives.py` lädt die Inaktiven-Liste von [ika-map.com](https://www.ika-map.com/inactives),
merkt sich den Stand in einer SQLite-Datenbank und erkennt bei jedem Lauf, **wer seit dem letzten
Lauf neu inaktiv geworden ist**. Daraus entsteht eine Plünderliste (`pluenderliste.html` / `.csv`),
sortiert nach: neu → bereit (Cooldown abgelaufen) → Entfernung zu deinen Städten.

> Das Tool greift nicht ins Spiel ein. Angriffe schickst du selbst ab – Bots bzw. automatisierte
> Aktionen im Spiel verstoßen gegen die Gameforge-Regeln und können zur Sperre führen.

## Einrichtung

```bash
pip install -r requirements.txt
cp config.example.json config.json   # eigene Städte (x/y) eintragen
```

| Schlüssel | Bedeutung |
|---|---|
| `server`, `world` | wie in der ika-map-URL (`server=2&world=72`) |
| `own_cities` | deine Städte; Entfernung = Abstand zur nächsten |
| `max_distance` | weiter entfernte Ziele ausblenden (`null` = alle) |
| `new_hours` | wie lange ein Ziel als „NEU“ markiert bleibt |
| `plunder_cooldown_hours` | nach dem Plündern so lange als „nicht bereit“ zeigen |
| `exclude_alliances` | Allianzen, die nie auf der Liste landen sollen |
| `page_param`, `max_pages` | falls ika-map paginiert: Name des Seiten-Parameters |

## Benutzung

```bash
python ika_inactives.py                          # Liste abrufen und auswerten
python ika_inactives.py --mark Spielername --note "Mauer 4, viel Marmor"
```

Der **erste Lauf** legt nur die Basis an (alle bisherigen Inaktiven gelten nicht als neu).
Ab dem zweiten Lauf werden neu aufgetauchte Inaktive als `NEU` gemeldet.

Automatisch z. B. alle 3 Stunden (Linux/macOS, `crontab -e`):

```
0 */3 * * * cd /pfad/zu/ikariam && python3 ika_inactives.py >> log.txt 2>&1
```

Unter Windows dasselbe über die Aufgabenplanung.

### Wenn der Abruf nicht klappt

Blockiert ika-map den direkten Abruf (HTTP 403, Cloudflare) oder werden die Daten per JavaScript
nachgeladen, die Seite im Browser öffnen, mit *Strg+S* speichern und einlesen:

```bash
python ika_inactives.py --html-file inactives.html
```

Der Parser nimmt die größte Tabelle der Seite und erkennt Spalten über ihre Überschrift
(Spieler, Allianz, Stadt, Insel, Koordinaten, Punkte, Rathaus); Koordinaten werden auch aus
`[x:y]`-Text oder `xcoord=…&ycoord=…`-Links gelesen.

## Tests

```bash
python -m unittest discover -s tests
```
