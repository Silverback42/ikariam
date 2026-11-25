# Ikariam-Plünderliste (ika-map.com)

> **Neu:** [`ikariam-mobile/`](ikariam-mobile/) – Userscript für Tampermonkey (Lemur Browser) mit
> handytauglicher Ressourcen- und Militär-Übersicht direkt im Spiel. Nur Anzeige, keine Automatik.

Web-App im Docker-Container, für die Bedienung vom Handy gebaut. Sie holt alle paar Stunden die
Inaktiven-Liste von [ika-map.com](https://www.ika-map.com/inactives) und erkennt, **wer seit dem
letzten Abruf neu inaktiv geworden ist**. Daraus macht sie eine Plünderliste:

- nur Spieler ab **2 Mio. Punkten** (in den Einstellungen änderbar)
- **Entfernung** zur nächsten deiner Städte, optional mit Höchstentfernung
- **Spionagebericht einfügen** → Rohstoffe werden ausgelesen, Beute und Schiffsbedarf geschätzt,
  die Liste wird nach Beute sortiert
- „Geplündert“-Knopf mit Cooldown, Koordinaten per Tipp kopieren, Filter „Neu“/„Bereit“

> Spionieren und Angreifen machst du im Spiel selbst. Das Tool greift nicht ins Spiel ein:
> Bots bzw. automatisierte Aktionen verstoßen gegen die Gameforge-Regeln und können zur Sperre führen.

## Start auf dem eigenen Server/NAS

Voraussetzung: Docker mit Compose (Synology Container Manager, Unraid, Raspberry Pi o. Ä.).

```bash
git clone <dieses Repo> ikariam && cd ikariam
docker compose up -d --build
```

Dann im Handy-Browser `http://<IP-des-NAS>:8080` öffnen, unter **Einstellungen** deine Städte
eintragen (eine pro Zeile, z. B. `Hauptstadt [50:50]`) und „Zum Startbildschirm hinzufügen“ wählen.

- Daten liegen in `./data/ika.db` (bleiben bei Updates erhalten).
- Update: `git pull && docker compose up -d --build`
- Passwort: in `docker-compose.yml` `APP_PASSWORD` setzen (Benutzer `APP_USER`).
- Von unterwegs: am einfachsten per [Tailscale](https://tailscale.com) (App auf Handy und NAS),
  statt Port 8080 ins Internet freizugeben. Wenn doch offen: unbedingt Passwort setzen.

### So funktioniert's

1. Der **erste Abruf** legt den Ausgangsstand an. Wer da schon inaktiv ist, gilt nicht als neu.
2. Jeder weitere Abruf (Standard alle 3 Stunden, oder „Jetzt abrufen“) markiert neu Inaktive mit **NEU**.
3. Bei einem Ziel **Spionagebericht** tippen: Bericht aus dem Spiel kopieren, einfügen, „Prüfen“, „Speichern“.
   Beute = Summe je Rohstoff (Bestand − *sicherer Bestand*). Den sicheren Bestand und die Ladung pro
   Schiff stellst du in den Einstellungen ein.
4. Nach dem Angriff **Geplündert** tippen → das Ziel wird für den Cooldown ausgegraut.

Blockiert ika-map den Abruf, steht der Fehler oben in der Liste. Dann die ika-map-Seite im Browser
speichern und über **HTML hochladen** einlesen.

## Kommandozeile (optional)

Dieselbe Logik gibt es auch ohne Web-Oberfläche.

### Einrichtung

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

### Benutzung

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

#### Wenn der Abruf nicht klappt

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
pip install httpx && python -m unittest discover -s tests
```
