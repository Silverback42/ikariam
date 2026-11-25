(function () {
'use strict';
var IKM = {};
IKM.VERSION = "0.1.0";
IKM.css = ":host { all: initial; }\n* { box-sizing: border-box; }\n\n.layer {\n  --bg: #f6f3ec; --card: #ffffff; --text: #1f1b16; --muted: #6b6257; --line: #e4ddd0;\n  --accent: #8a5a1f; --accent-text: #ffffff; --bar: #ece6da;\n  --ok: #4f8a3a; --high: #d08a1c; --full: #c7362b; --pos: #2f7a2b; --neg: #b3261e;\n  --wood: #8b5a2b; --wine: #8e2c5a; --marble: #9aa3ad; --crystal: #3a8fb7; --sulfur: #c9a227;\n  position: fixed; left: 0; top: 0; transform-origin: 0 0; pointer-events: none;\n  font-family: system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;\n  font-size: 16px; line-height: 1.4; color: var(--text);\n  -webkit-text-size-adjust: 100%; text-size-adjust: 100%;\n}\n@media (prefers-color-scheme: dark) {\n  .layer:not([data-theme=\"light\"]) {\n    --bg: #15130f; --card: #221f1a; --text: #f1ece3; --muted: #aaa093; --line: #36312a;\n    --accent: #d39a52; --accent-text: #1b150d; --bar: #36312a;\n    --pos: #7cc46a; --neg: #ff8a80; --marble: #b8c0c9;\n  }\n}\n.layer[data-theme=\"dark\"] {\n  --bg: #15130f; --card: #221f1a; --text: #f1ece3; --muted: #aaa093; --line: #36312a;\n  --accent: #d39a52; --accent-text: #1b150d; --bar: #36312a;\n  --pos: #7cc46a; --neg: #ff8a80; --marble: #b8c0c9;\n}\n\nbutton, select, input { font: inherit; color: inherit; }\na { color: inherit; text-decoration: none; }\n\n/* ---------- schwebender Button ---------- */\n.fab {\n  position: absolute; bottom: 20px; right: 16px; width: 60px; height: 60px; border-radius: 50%;\n  border: 0; background: var(--accent); color: var(--accent-text); pointer-events: auto;\n  box-shadow: 0 4px 14px rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center;\n  font-size: 26px; cursor: pointer; -webkit-tap-highlight-color: transparent;\n}\n.fab.left { right: auto; left: 16px; }\n.fab svg { width: 28px; height: 28px; }\n.fab .alert-dot {\n  position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%;\n  background: var(--full); border: 2px solid #fff; display: none;\n}\n.fab.has-alert .alert-dot { display: block; }\n.layer.open .fab { display: none; }\n\n/* ---------- Panel ---------- */\n.panel {\n  position: absolute; inset: 0; background: var(--bg); pointer-events: auto;\n  display: none; flex-direction: column; overscroll-behavior: contain;\n}\n.layer.open .panel { display: flex; }\n/* Medienabfragen sehen die (breite) Desktop-Seite, deshalb setzt panel.js die Klasse selbst. */\n.layer.wide .panel { left: auto; width: 480px; box-shadow: -6px 0 24px rgba(0,0,0,.25); }\n.topbar {\n  display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 16px;\n  border-bottom: 1px solid var(--line); background: var(--card);\n}\n.topbar h1 { font-size: 18px; margin: 0; flex: 1; font-weight: 650; }\n.icon-btn {\n  min-width: 48px; min-height: 48px; border: 0; background: transparent; border-radius: 12px;\n  font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;\n}\n.icon-btn:active { background: var(--line); }\n.tabs { display: flex; background: var(--card); border-bottom: 1px solid var(--line); }\n.tab {\n  flex: 1; min-height: 48px; border: 0; background: transparent; cursor: pointer;\n  font-size: 16px; color: var(--muted); border-bottom: 3px solid transparent;\n}\n.tab[aria-selected=\"true\"] { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }\n.content {\n  flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;\n  padding: 12px 12px 32px;\n}\n\n/* ---------- Angriffs-Hinweis ---------- */\n.alert-banner {\n  display: none; align-items: center; gap: 10px; min-height: 48px; padding: 10px 16px;\n  background: var(--full); color: #fff; font-weight: 600;\n}\n.alert-banner.show { display: flex; }\n.alert-banner a { text-decoration: underline; margin-left: auto; padding: 8px 0; }\n\n/* ---------- Karten ---------- */\n.card {\n  background: var(--card); border: 1px solid var(--line); border-radius: 14px;\n  padding: 4px 14px 12px; margin-bottom: 12px;\n}\n.card.is-stale { opacity: .8; }\n.card-head {\n  display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; min-height: 48px;\n  padding: 10px 0 8px; border-bottom: 1px solid var(--line); margin-bottom: 8px;\n}\n.city-name { font-size: 18px; font-weight: 650; text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 3px; }\n.coords { color: var(--muted); }\n.age { color: var(--muted); font-size: 14px; flex-basis: 100%; }\n.age.stale { color: var(--high); font-weight: 600; }\n.badge { font-size: 12px; background: var(--accent); color: var(--accent-text); border-radius: 8px; padding: 1px 7px; vertical-align: 2px; text-decoration: none; display: inline-block; }\n.card-title { font-weight: 650; padding: 10px 0 8px; }\n.hint { color: var(--muted); margin: 6px 0; }\n.hint.big { font-size: 17px; padding: 24px 8px; text-align: center; }\n.hint.small { font-size: 14px; margin: 2px 0; }\n\n.res { padding: 6px 0; }\n.res-head, .res-foot { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }\n.res-name { display: inline-flex; align-items: center; gap: 6px; }\n.res-amount { font-variant-numeric: tabular-nums; font-weight: 600; }\n.res-amount small { color: var(--muted); font-weight: 400; font-size: 14px; }\n.res-foot { font-size: 14px; }\n.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }\n.dot-wood { background: var(--wood); } .dot-wine { background: var(--wine); }\n.dot-marble { background: var(--marble); } .dot-crystal { background: var(--crystal); }\n.dot-sulfur { background: var(--sulfur); }\n.bar { height: 10px; background: var(--bar); border-radius: 5px; overflow: hidden; margin: 4px 0; }\n.fill { height: 100%; border-radius: 5px; }\n.fill-ok { background: var(--ok); } .fill-high { background: var(--high); } .fill-full { background: var(--full); }\n.rate { font-variant-numeric: tabular-nums; color: var(--muted); }\n.rate.pos { color: var(--pos); } .rate.neg { color: var(--neg); }\n.note { color: var(--muted); }\n.note.warn { color: var(--full); font-weight: 600; }\n\n.sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }\n.sum-cell { display: flex; flex-direction: column; }\n.sum-cell strong { font-size: 18px; font-variant-numeric: tabular-nums; }\n.sum-cell .rate { font-size: 14px; }\n\n.mil-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 14px; }\n.mil-title { font-weight: 600; color: var(--muted); font-size: 14px; text-transform: uppercase; letter-spacing: .04em; margin: 4px 0; }\n.mil-list { list-style: none; margin: 0; padding: 0; }\n.mil-list li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--line); }\n.mil-list li:last-child { border-bottom: 0; }\n.mil-list strong { font-variant-numeric: tabular-nums; }\n\n/* ---------- Einstellungen ---------- */\n.setting {\n  display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px;\n  padding: 8px 0; border-bottom: 1px solid var(--line);\n}\n.setting:last-child { border-bottom: 0; }\n.setting .label { flex: 1; }\n.setting .label small { display: block; color: var(--muted); font-size: 14px; }\n.switch { position: relative; width: 56px; height: 32px; flex: none; }\n.switch input { position: absolute; inset: -8px; opacity: 0; width: 72px; height: 48px; margin: 0; cursor: pointer; z-index: 1; }\n.switch span { position: absolute; inset: 0; background: var(--bar); border-radius: 16px; transition: background .15s; }\n.switch span::after {\n  content: \"\"; position: absolute; top: 3px; left: 3px; width: 26px; height: 26px; border-radius: 50%;\n  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .15s;\n}\n.switch input:checked + span { background: var(--accent); }\n.switch input:checked + span::after { transform: translateX(24px); }\nselect { min-height: 44px; min-width: 120px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); }\n.btn {\n  min-height: 48px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--line);\n  background: var(--card); cursor: pointer; font-weight: 600;\n}\n.btn.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }\n.btn.danger { color: var(--full); }\n.btn-row { display: flex; flex-wrap: wrap; gap: 10px; padding: 10px 0; }\ntextarea.debug {\n  width: 100%; height: 160px; font: 12px/1.3 ui-monospace, monospace; border-radius: 10px;\n  border: 1px solid var(--line); background: var(--bg); color: var(--text); padding: 8px; display: none;\n}\ntextarea.debug.show { display: block; }\n.status { color: var(--pos); font-size: 14px; min-height: 20px; }\n.footer-note { color: var(--muted); font-size: 14px; padding: 8px 2px; }\n";
// ---- src/core/model.js ----
/*
 * Reine Berechnungsfunktionen (kein DOM, kein Speicher) – werden mit Node getestet.
 * Alle Raten sind pro Stunde, alle Zeitstempel in Millisekunden.
 */
IKM.model = (function () {
  'use strict';

  var RESOURCES = ['wood', 'wine', 'marble', 'crystal', 'sulfur'];
  var LABELS = { wood: 'Holz', wine: 'Wein', marble: 'Marmor', crystal: 'Kristallglas', sulfur: 'Schwefel' };
  var HOUR = 3600 * 1000;

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v === 'string') {
      var n = parseFloat(v.replace(/[^\d.\-]/g, ''));
      return isFinite(n) ? n : 0;
    }
    return 0;
  }

  /** Netto-Rate pro Stunde (Wein: Produktion minus Verbrauch). */
  function netRate(city, res) {
    var prod = num(city.production && city.production[res]);
    if (res === 'wine') prod -= num(city.wineSpendings);
    return prod;
  }

  /** Hochgerechneter Bestand einer Ressource zum Zeitpunkt `now`. */
  function projectAmount(city, res, now) {
    var base = num(city.resources && city.resources[res]);
    var max = num(city.max && city.max[res]);
    var hours = Math.max(0, (now - num(city.updatedAt)) / HOUR);
    var value = base + netRate(city, res) * hours;
    if (value < 0) value = 0;
    if (max > 0 && value > max) value = Math.max(max, base); // nie über das Lager hinaus wachsen
    return Math.floor(value);
  }

  /** Stunden, bis das Lager voll ist. 0 = schon voll, null = wird nie voll. */
  function hoursUntilFull(city, res, now) {
    var max = num(city.max && city.max[res]);
    if (max <= 0) return null;
    var cur = projectAmount(city, res, now);
    if (cur >= max) return 0;
    var rate = netRate(city, res);
    if (rate <= 0) return null;
    return (max - cur) / rate;
  }

  /** Stunden, bis der Wein aufgebraucht ist. null = kein Netto-Verbrauch. */
  function wineHoursLeft(city, now) {
    var rate = netRate(city, 'wine');
    if (rate >= 0) return null;
    return projectAmount(city, 'wine', now) / -rate;
  }

  function fillRatio(city, res, now) {
    var max = num(city.max && city.max[res]);
    if (max <= 0) return 0;
    return Math.min(1, projectAmount(city, res, now) / max);
  }

  function isStale(city, now, staleHours) {
    if (!city.updatedAt) return true;
    return now - city.updatedAt > (staleHours || 6) * HOUR;
  }

  /** Summen über alle Städte (hochgerechnet). */
  function totals(cities, now) {
    var out = { amount: {}, rate: {} };
    RESOURCES.forEach(function (r) { out.amount[r] = 0; out.rate[r] = 0; });
    cities.forEach(function (c) {
      if (!c.updatedAt) return;
      RESOURCES.forEach(function (r) {
        out.amount[r] += projectAmount(c, r, now);
        out.rate[r] += netRate(c, r);
      });
    });
    return out;
  }

  function formatNumber(n) {
    n = Math.round(num(n));
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '-' : '') + s;
  }

  function formatSigned(n) {
    n = Math.round(num(n));
    return (n > 0 ? '+' : '') + formatNumber(n);
  }

  /** Dauer in Stunden -> "3 T 4 Std", "5 Std 12 Min", "12 Min". */
  function formatHours(h) {
    if (h === null || h === undefined || !isFinite(h)) return '–';
    if (h <= 0) return 'jetzt';
    var mins = Math.round(h * 60);
    var d = Math.floor(mins / 1440);
    var hr = Math.floor((mins % 1440) / 60);
    var m = mins % 60;
    if (d > 0) return d + ' T ' + hr + ' Std';
    if (hr > 0) return hr + ' Std ' + m + ' Min';
    return Math.max(1, m) + ' Min';
  }

  /** "vor 5 Min", "vor 3 Std", "vor 2 T". */
  function formatAge(ts, now) {
    if (!ts) return 'nie';
    var mins = Math.floor((now - ts) / 60000);
    if (mins < 1) return 'gerade eben';
    if (mins < 60) return 'vor ' + mins + ' Min';
    var h = Math.floor(mins / 60);
    if (h < 48) return 'vor ' + h + ' Std';
    return 'vor ' + Math.floor(h / 24) + ' T';
  }

  return {
    RESOURCES: RESOURCES,
    LABELS: LABELS,
    num: num,
    netRate: netRate,
    projectAmount: projectAmount,
    hoursUntilFull: hoursUntilFull,
    wineHoursLeft: wineHoursLeft,
    fillRatio: fillRatio,
    isStale: isStale,
    totals: totals,
    formatNumber: formatNumber,
    formatSigned: formatSigned,
    formatHours: formatHours,
    formatAge: formatAge
  };
})();

// ---- src/core/storage.js ----
/*
 * Speicherung im localStorage der Ikariam-Domain, getrennt pro Welt (Hostname,
 * z. B. s45-de.ikariam.gameforge.com). Funktioniert im Userscript und in der
 * Erweiterung gleich, weil beide im Seitenkontext laufen.
 */
IKM.storage = (function () {
  'use strict';

  var VERSION = 1;
  var SETTINGS_KEY = 'ikariamMobile:settings';
  var DEFAULT_SETTINGS = {
    fitViewport: false,
    staleHours: 6,
    theme: 'auto',      // auto | light | dark
    debug: false,
    fabSide: 'right'    // right | left
  };

  function worldKey(host) {
    return 'ikariamMobile:v' + VERSION + ':' + (host || location.hostname);
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  function emptyWorld() {
    return { cities: {}, order: [], alert: null, updatedAt: 0 };
  }

  function loadWorld(host) {
    var raw = safeGet(worldKey(host));
    if (!raw) return emptyWorld();
    try {
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !data.cities) return emptyWorld();
      if (!Array.isArray(data.order)) data.order = Object.keys(data.cities);
      return data;
    } catch (e) {
      return emptyWorld();
    }
  }

  function saveWorld(data, host) {
    data.updatedAt = Date.now();
    return safeSet(worldKey(host), JSON.stringify(data));
  }

  function clearWorld(host) {
    try { localStorage.removeItem(worldKey(host)); } catch (e) { /* egal */ }
  }

  function loadSettings() {
    var out = {};
    var stored = {};
    try { stored = JSON.parse(safeGet(SETTINGS_KEY) || '{}') || {}; } catch (e) { stored = {}; }
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
      out[k] = k in stored ? stored[k] : DEFAULT_SETTINGS[k];
    });
    return out;
  }

  function saveSettings(settings) {
    return safeSet(SETTINGS_KEY, JSON.stringify(settings));
  }

  return {
    worldKey: worldKey,
    loadWorld: loadWorld,
    saveWorld: saveWorld,
    clearWorld: clearWorld,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS
  };
})();

// ---- src/core/capture.js ----
/*
 * Datenerfassung. Liest nur, was Ikariam ohnehin an den Browser schickt:
 *  - window.ikariam.model (aktuelle Stadt, Bestände, Produktion, Stadtliste)
 *  - die Kopfzeile im DOM (Produktion pro Stunde, Weinverbrauch)
 *  - AJAX-Antworten (JSON-Arrays wie ["updateGlobalData", {...}]), mitgelesen über
 *    einen Haken in XMLHttpRequest. Es werden KEINE eigenen Anfragen geschickt.
 *
 * Alle Feldnamen stehen hier gebündelt. Wenn Ikariam etwas umbenennt, wird nur
 * diese Datei angepasst. Fehlende Felder werden toleriert.
 */
IKM.capture = (function () {
  'use strict';

  var M = IKM.model;
  var TRADEGOODS = { 1: 'wine', 2: 'marble', 3: 'crystal', 4: 'sulfur' };
  var RES_KEYS = { wood: 'resource', wine: '1', marble: '2', crystal: '3', sulfur: '4' };
  var SENSITIVE = /actionrequest|token|session|password|passwort|email|mail|login|cookie/i;

  var listeners = [];
  var debugLog = { xhr: [], model: null, dom: null, military: null, errors: [] };

  /* ------------------------------------------------------------------ helpers */

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  /** Sucht (begrenzt tief) das erste Objekt, das `key` besitzt. */
  function findWithKey(root, key, depth) {
    if (depth === undefined) depth = 6;
    if (!root || typeof root !== 'object' || depth < 0) return null;
    if (!Array.isArray(root) && Object.prototype.hasOwnProperty.call(root, key)) return root;
    var keys = Object.keys(root);
    for (var i = 0; i < keys.length; i++) {
      var found = findWithKey(root[keys[i]], key, depth - 1);
      if (found) return found;
    }
    return null;
  }

  function pickResources(obj) {
    var out = {};
    M.RESOURCES.forEach(function (r) {
      var v = null;
      if (isObj(obj)) {
        if (obj[RES_KEYS[r]] !== undefined) v = obj[RES_KEYS[r]];
        else if (obj[r] !== undefined) v = obj[r];
      } else if (typeof obj === 'number' || typeof obj === 'string') {
        v = obj; // ein gemeinsamer Wert für alle Ressourcen
      }
      out[r] = M.num(v);
    });
    return out;
  }

  /** Stadtliste aus relatedCityData / cityDropdownMenu. Nur eigene Städte. */
  function normalizeCityList(rel) {
    var out = { cities: [], selectedId: null };
    if (!isObj(rel)) return out;
    Object.keys(rel).forEach(function (k) {
      var c = rel[k];
      if (!isObj(c) || c.id === undefined) return;
      var own = !c.relationship || c.relationship === 'ownCity';
      if (!own) return;
      out.cities.push({
        id: String(c.id),
        name: String(c.name || ('Stadt ' + c.id)).trim(),
        coords: String(c.coords || '').trim(),
        tradegood: M.num(c.tradegood) || null
      });
    });
    var sel = rel.selectedCity;
    if (sel && isObj(rel[sel]) && rel[sel].id !== undefined) {
      var rs = rel[sel].relationship;
      if (!rs || rs === 'ownCity') out.selectedId = String(rel[sel].id);
    }
    return out;
  }

  /**
   * Normalisiert einen Datensatz aus ikariam.model oder aus headerData einer
   * AJAX-Antwort. Gibt null zurück, wenn keine Bestände enthalten sind.
   * Produktion im Modell ist pro Sekunde, Weinverbrauch pro Stunde.
   */
  function normalizeHeader(src) {
    if (!isObj(src) || !isObj(src.currentResources)) return null;
    var list = normalizeCityList(src.relatedCityData || src.cityDropdownMenu);
    var production = { wood: 0, wine: 0, marble: 0, crystal: 0, sulfur: 0 };
    production.wood = M.num(src.resourceProduction) * 3600;
    var tg = TRADEGOODS[M.num(src.producedTradegood)];
    if (tg) production[tg] = M.num(src.tradegoodProduction) * 3600;
    return {
      cityId: list.selectedId,
      cityList: list.cities,
      resources: pickResources(src.currentResources),
      max: pickResources(src.maxResources),
      production: production,
      wineSpendings: M.num(src.wineSpendings),
      producedTradegood: tg || null
    };
  }

  /** Militärberater-Status aus einer CSS-Klasse ("normalalert" = Angriff). */
  function alertFromClass(cls) {
    cls = String(cls || '');
    return { active: /alert/i.test(cls), cls: cls };
  }

  /* ------------------------------------------------------- Militär-Tabellen */

  function textOf(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }

  function unitInfo(cell) {
    var el = cell.querySelector('[title]') || (cell.hasAttribute && cell.hasAttribute('title') ? cell : null);
    var img = cell.querySelector('img[alt]');
    var name = (el && el.getAttribute('title')) || (img && img.getAttribute('alt')) || '';
    var idMatch = null;
    var withClass = cell.querySelectorAll('[class]');
    for (var i = 0; i < withClass.length && !idMatch; i++) {
      idMatch = /\bs(\d{3})\b/.exec(withClass[i].getAttribute('class'));
    }
    if (!name) {
      var t = textOf(cell);
      if (t && !/^[\d.,\s\-]*$/.test(t)) name = t;
    }
    return name ? { name: name.trim(), typeId: idMatch ? idMatch[1] : null } : null;
  }

  function countOf(cell) {
    var t = textOf(cell);
    if (t === '' || t === '-' || t === '–') return 0;
    if (!/^[\d.,\s]+$/.test(t)) return null;
    return parseInt(t.replace(/[^\d]/g, ''), 10) || 0;
  }

  /**
   * Liest Truppen- und Schifftabellen. Erwartet Zeilenpaare: eine Zeile mit
   * Einheiten (title/alt), darunter eine Zeile mit Anzahlen. Einheiten-IDs 3xx
   * sind Landtruppen, 2xx Schiffe; sonst entscheidet der umgebende Tab.
   */
  function parseMilitary(root) {
    var out = { units: [], ships: [] };
    if (!root || !root.querySelectorAll) return out;
    var seen = {};
    var tables = root.querySelectorAll('table');
    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var inShips = !!(table.closest && table.closest('#tabShips, .tabShips, [id*="hip"], [id*="leet"]'));
      var rows = table.rows || table.querySelectorAll('tr');
      for (var i = 0; i < rows.length - 1; i++) {
        var nameCells = rows[i].cells;
        var infos = [];
        var named = 0;
        for (var c = 0; c < nameCells.length; c++) {
          var info = unitInfo(nameCells[c]);
          infos.push(info);
          if (info) named++;
        }
        if (!named) continue;
        var countCells = rows[i + 1].cells;
        var counts = [];
        var numeric = 0;
        for (var d = 0; d < countCells.length; d++) {
          var n = countOf(countCells[d]);
          counts.push(n);
          if (n !== null) numeric++;
        }
        if (numeric < Math.max(1, Math.ceil(named / 2))) continue;
        // Spalten angleichen, falls die Anzahl-Zeile eine Beschriftungsspalte mehr hat
        var offset = countCells.length - nameCells.length;
        if (offset < 0) offset = 0;
        for (var k = 0; k < infos.length; k++) {
          if (!infos[k]) continue;
          var cnt = counts[k + offset];
          if (cnt === null || cnt === undefined) continue;
          var info2 = infos[k];
          var key = (info2.typeId || '') + '|' + info2.name;
          if (seen[key]) continue;
          seen[key] = true;
          var isShip = info2.typeId ? info2.typeId.charAt(0) === '2' : inShips;
          (isShip ? out.ships : out.units).push({ name: info2.name, typeId: info2.typeId, count: cnt });
        }
        i++; // Anzahl-Zeile überspringen
      }
    }
    return out;
  }

  /* ------------------------------------------------------- Seite auslesen */

  function gameModel() {
    try { return window.ikariam && window.ikariam.model ? window.ikariam.model : null; } catch (e) { return null; }
  }

  function domNumber(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var t = textOf(el);
    if (!t || t === '-') return 0;
    var neg = /^[-−]/.test(t);
    var n = parseInt(t.replace(/[^\d]/g, ''), 10);
    if (!isFinite(n)) return null;
    return neg ? -n : n;
  }

  /** Produktion pro Stunde, wie sie in der Kopfzeile angezeigt wird. */
  function readDomProduction() {
    return {
      wood: domNumber('js_GlobalMenu_resourceProduction'),
      wine: domNumber('js_GlobalMenu_production_wine'),
      marble: domNumber('js_GlobalMenu_production_marble'),
      crystal: domNumber('js_GlobalMenu_production_crystal'),
      sulfur: domNumber('js_GlobalMenu_production_sulfur'),
      wineSpendings: domNumber('js_GlobalMenu_WineConsumption')
    };
  }

  function readDomAlert() {
    // Reihenfolge wichtig: der Link trägt die Status-Klasse, nicht der umgebende Container.
    var sels = ['#advMilitary a', '#js_GlobalMenu_military', '#advMilitary'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) return alertFromClass(el.className);
    }
    return null;
  }

  function currentViewId() {
    try {
      var tv = window.ikariam && window.ikariam.templateView;
      if (tv && tv.id) return tv.id;
    } catch (e) { /* ignorieren */ }
    var m = /[?&]view=([^&]+)/.exec(location.search);
    return m ? m[1] : null;
  }

  /* ------------------------------------------------------- Speichern */

  function applyCityList(world, list) {
    if (!list || !list.length) return;
    var order = [];
    list.forEach(function (c) {
      var cur = world.cities[c.id] || { id: c.id };
      cur.name = c.name;
      cur.coords = c.coords;
      if (c.tradegood) cur.tradegood = c.tradegood;
      world.cities[c.id] = cur;
      order.push(c.id);
    });
    world.order = order;
  }

  function applyHeader(world, h, dom) {
    applyCityList(world, h.cityList);
    if (!h.cityId) return false;
    var city = world.cities[h.cityId] || { id: h.cityId, name: 'Stadt ' + h.cityId };
    var production = h.production;
    if (dom) {
      // Werte aus der Kopfzeile sind bereits pro Stunde und genau das, was der Spieler sieht.
      // Bei Luxusgütern nur das Gut der Stadt übernehmen (ausgeblendete Felder können veraltet sein).
      M.RESOURCES.forEach(function (r) {
        var relevant = r === 'wood' || r === h.producedTradegood;
        if (relevant && dom[r] !== null && dom[r] !== undefined && dom[r] > 0) production[r] = dom[r];
      });
      if (dom.wineSpendings !== null && dom.wineSpendings !== undefined && !h.wineSpendings) h.wineSpendings = dom.wineSpendings;
    }
    city.resources = h.resources;
    city.max = h.max;
    city.production = production;
    city.wineSpendings = h.wineSpendings;
    city.updatedAt = Date.now();
    world.cities[h.cityId] = city;
    if (world.order.indexOf(h.cityId) === -1) world.order.push(h.cityId);
    return true;
  }

  function selectedCityId() {
    var m = gameModel();
    if (!m) return null;
    return normalizeCityList(m.relatedCityData).selectedId;
  }

  function applyMilitary(world, cityId, mil, raw) {
    if (!cityId) return false;
    if (!mil.units.length && !mil.ships.length) {
      debugLog.military = { cityId: cityId, note: 'keine Einheiten erkannt', html: raw ? String(raw).slice(0, 6000) : null };
      return false;
    }
    var city = world.cities[cityId] || { id: cityId, name: 'Stadt ' + cityId };
    city.military = { units: mil.units, ships: mil.ships, updatedAt: Date.now() };
    world.cities[cityId] = city;
    debugLog.military = { cityId: cityId, parsed: mil, html: raw ? String(raw).slice(0, 6000) : null };
    return true;
  }

  function applyAlert(world, a) {
    if (!a) return;
    world.alert = { active: a.active, cls: a.cls, updatedAt: Date.now() };
  }

  /* ------------------------------------------------------- Ablauf */

  var world = null;

  function emit() {
    IKM.storage.saveWorld(world);
    listeners.forEach(function (cb) { try { cb(world); } catch (e) { logError(e); } });
  }

  function logError(e) {
    debugLog.errors.push(String(e && e.stack || e).slice(0, 500));
    if (debugLog.errors.length > 10) debugLog.errors.shift();
  }

  /** Liest den aktuellen Stand direkt von der Seite. */
  function captureFromPage() {
    try {
      var m = gameModel();
      var dom = readDomProduction();
      debugLog.dom = dom;
      if (m) {
        debugLog.model = sanitize(pickModel(m));
        var h = normalizeHeader(m);
        if (h) applyHeader(world, h, dom);
        else applyCityList(world, normalizeCityList(m.relatedCityData).cities);
      }
      applyAlert(world, readDomAlert());
      if (currentViewId() === 'cityMilitary' || document.getElementById('cityMilitary')) {
        var root = document.getElementById('cityMilitary') || document;
        applyMilitary(world, selectedCityId(), parseMilitary(root), root.innerHTML);
      }
      emit();
    } catch (e) { logError(e); }
  }

  /** Verarbeitet eine mitgelesene AJAX-Antwort. */
  function handlePayload(payload) {
    try {
      var changed = false;
      var header = findWithKey(payload, 'currentResources');
      if (header) {
        var h = normalizeHeader(header);
        if (h) {
          if (!h.cityId) h.cityId = selectedCityId();
          changed = applyHeader(world, h, null) || changed;
        }
      }
      var adv = findWithKey(payload, 'advisors');
      if (adv && isObj(adv.advisors) && adv.advisors.military) {
        var mc = adv.advisors.military;
        applyAlert(world, alertFromClass(isObj(mc) ? (mc.cssclass || mc.cssClass || mc['class']) : mc));
        changed = true;
      }
      if (Array.isArray(payload)) {
        payload.forEach(function (entry) {
          if (!Array.isArray(entry) || entry[0] !== 'changeView' || !Array.isArray(entry[1])) return;
          if (entry[1][0] !== 'cityMilitary' || typeof entry[1][1] !== 'string') return;
          var doc = new DOMParser().parseFromString(entry[1][1], 'text/html');
          changed = applyMilitary(world, selectedCityId(), parseMilitary(doc), entry[1][1]) || changed;
        });
      }
      if (changed) emit();
    } catch (e) { logError(e); }
    // Ikariam überträgt die Antwort kurz danach ins Modell und die Kopfzeile.
    setTimeout(captureFromPage, 250);
  }

  function hookXhr() {
    var X = window.XMLHttpRequest;
    if (!X || X.prototype.__ikmHooked) return;
    X.prototype.__ikmHooked = true;
    var origSend = X.prototype.send;
    X.prototype.send = function () {
      var xhr = this;
      xhr.addEventListener('load', function () {
        var text;
        try {
          if (xhr.responseType && xhr.responseType !== 'text') return;
          text = xhr.responseText;
        } catch (e) { return; }
        if (!text || text.charAt(0) !== '[') return;
        var payload;
        try { payload = JSON.parse(text); } catch (e) { return; }
        recordXhr(xhr.responseURL, payload);
        handlePayload(payload);
      });
      return origSend.apply(this, arguments);
    };
  }

  /* ------------------------------------------------------- Debug */

  function pickModel(m) {
    var keys = ['currentResources', 'maxResources', 'resourceProduction', 'tradegoodProduction',
      'producedTradegood', 'wineSpendings', 'relatedCityData', 'isOwnCity', 'requestTime', 'serverTime'];
    var out = {};
    keys.forEach(function (k) { if (m[k] !== undefined) out[k] = m[k]; });
    out._alleSchluessel = Object.keys(m);
    return out;
  }

  function sanitize(v, depth) {
    depth = depth || 0;
    if (depth > 8) return '[zu tief]';
    if (typeof v === 'string') return v.length > 4000 ? v.slice(0, 4000) + '…[gekürzt]' : v;
    if (!v || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.slice(0, 50).map(function (x) { return sanitize(x, depth + 1); });
    var out = {};
    Object.keys(v).forEach(function (k) {
      out[k] = SENSITIVE.test(k) ? '[entfernt]' : sanitize(v[k], depth + 1);
    });
    return out;
  }

  function recordXhr(url, payload) {
    var u = String(url || '').replace(/actionRequest=[^&]*/gi, 'actionRequest=[entfernt]');
    debugLog.xhr.push({ at: new Date().toISOString(), url: u, payload: sanitize(payload) });
    if (debugLog.xhr.length > 5) debugLog.xhr.shift();
  }

  function debugExport() {
    return JSON.stringify({
      tool: 'Ikariam Mobile',
      version: IKM.VERSION,
      host: location.hostname,
      view: currentViewId(),
      userAgent: navigator.userAgent,
      at: new Date().toISOString(),
      gespeichert: world,
      roh: debugLog
    }, null, 2);
  }

  /* ------------------------------------------------------- Start */

  function start() {
    world = IKM.storage.loadWorld();
    hookXhr();
    captureFromPage();
  }

  return {
    start: start,
    captureFromPage: captureFromPage,
    handlePayload: handlePayload,
    getWorld: function () { return world; },
    currentCityId: selectedCityId,
    resetWorld: function () { IKM.storage.clearWorld(); world = IKM.storage.loadWorld(); emit(); },
    onChange: function (cb) { listeners.push(cb); },
    debugExport: debugExport,
    // für Tests
    normalizeHeader: normalizeHeader,
    normalizeCityList: normalizeCityList,
    alertFromClass: alertFromClass,
    parseMilitary: parseMilitary,
    findWithKey: findWithKey,
    sanitize: sanitize
  };
})();

// ---- src/ui/viewport.js ----
/*
 * „Seite an Bildschirmbreite anpassen“: setzt das Viewport-Meta-Tag auf die
 * tatsächliche Breite der Desktop-Seite, damit sie ohne seitliches Scrollen
 * auf den Bildschirm passt. Außerdem liefert dieses Modul den Skalierungsfaktor,
 * mit dem unser Panel unabhängig vom Seiten-Zoom gut lesbar bleibt.
 */
IKM.viewport = (function () {
  'use strict';

  var META_ID = 'ikariam-mobile-viewport';
  var original = null;      // ursprünglicher content-Wert (oder '' wenn kein Tag existierte)
  var active = false;
  var timer = null;

  function pageWidth() {
    var de = document.documentElement;
    var b = document.body;
    var w = Math.max(de ? de.scrollWidth : 0, b ? b.scrollWidth : 0);
    // Ikariam-Desktopseite ist mindestens ~1000px breit; Ausreißer begrenzen.
    return Math.min(Math.max(w, 320), 2400);
  }

  function metaTag() {
    return document.querySelector('meta[name="viewport"]');
  }

  function apply() {
    if (!active) return;
    var meta = metaTag();
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.id = META_ID;
      (document.head || document.documentElement).appendChild(meta);
    }
    var w = pageWidth();
    var content = 'width=' + w + ', user-scalable=yes';
    if (meta.getAttribute('content') !== content) meta.setAttribute('content', content);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 300);
  }

  function setFit(on) {
    if (on === active) { if (on) apply(); return; }
    var meta = metaTag();
    if (on) {
      original = meta ? (meta.getAttribute('content') || '') : null;
      active = true;
      apply();
      window.addEventListener('resize', schedule);
      window.addEventListener('load', schedule);
    } else {
      active = false;
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule);
      if (meta) {
        if (original === null || meta.id === META_ID) meta.parentNode.removeChild(meta);
        else meta.setAttribute('content', original);
      }
      original = null;
    }
  }

  /** Breite des Geräts in CSS-Pixeln bei Zoom 1 (Hoch- bzw. Querformat). */
  function deviceWidth() {
    var sw = screen.width || 0, sh = screen.height || 0;
    var landscape = window.matchMedia && window.matchMedia('(orientation: landscape)').matches;
    var w = landscape ? Math.max(sw, sh) : Math.min(sw, sh);
    return w || window.innerWidth;
  }

  /**
   * Sichtbarer Bereich und Faktor, um den unser Panel vergrößert werden muss,
   * damit 16px auch bei herausgezoomter Desktopseite echte 16px sind.
   */
  function visible() {
    var vv = window.visualViewport;
    var width = vv ? vv.width : window.innerWidth;
    var height = vv ? vv.height : window.innerHeight;
    var f = Math.max(1, width / deviceWidth());
    return {
      left: vv ? vv.offsetLeft : 0,
      top: vv ? vv.offsetTop : 0,
      width: width,
      height: height,
      scale: f
    };
  }

  return { setFit: setFit, visible: visible, pageWidth: pageWidth };
})();

// ---- src/features/resources.js ----
/*
 * Ressourcen-Übersicht: eine Karte pro Stadt, Bestände als Füllstandsbalken.
 * Nur Anzeige – ein Tipp auf den Stadtnamen ist ein normaler Spiel-Link.
 */
IKM.resources = (function () {
  'use strict';

  var M = IKM.model;
  var esc = function (s) { return IKM.ui.esc(s); };

  function cityLink(city) {
    return '?view=city&cityId=' + encodeURIComponent(city.id);
  }

  function resourceRow(city, r, now) {
    var amount = M.projectAmount(city, r, now);
    var max = M.num(city.max && city.max[r]);
    var ratio = M.fillRatio(city, r, now);
    var rate = M.netRate(city, r);
    var level = ratio >= 0.9 ? 'full' : ratio >= 0.75 ? 'high' : 'ok';
    var note = '';
    if (r === 'wine') {
      var left = M.wineHoursLeft(city, now);
      if (left !== null) {
        note = '<span class="note ' + (left < 12 ? 'warn' : '') + '">reicht ' + M.formatHours(left) + '</span>';
      }
    }
    if (!note) {
      var full = M.hoursUntilFull(city, r, now);
      if (full === 0) note = '<span class="note warn">Lager voll</span>';
      else if (full !== null) note = '<span class="note ' + (full < 3 ? 'warn' : '') + '">voll in ' + M.formatHours(full) + '</span>';
    }
    return '' +
      '<div class="res res-' + r + '">' +
        '<div class="res-head">' +
          '<span class="res-name"><i class="dot dot-' + r + '"></i>' + M.LABELS[r] + '</span>' +
          '<span class="res-amount">' + M.formatNumber(amount) +
            (max ? '<small> / ' + M.formatNumber(max) + '</small>' : '') + '</span>' +
        '</div>' +
        '<div class="bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(ratio * 100) + '">' +
          '<div class="fill fill-' + level + '" style="width:' + (ratio * 100).toFixed(1) + '%"></div>' +
        '</div>' +
        '<div class="res-foot">' +
          '<span class="rate ' + (rate < 0 ? 'neg' : rate > 0 ? 'pos' : '') + '">' +
            (rate ? M.formatSigned(rate) + '/Std' : 'keine Produktion') + '</span>' +
          note +
        '</div>' +
      '</div>';
  }

  function cityCard(city, now, settings, currentId) {
    var stale = M.isStale(city, now, settings.staleHours);
    var head = '' +
      '<a class="card-head" href="' + cityLink(city) + '" data-close>' +
        '<span class="city-name">' + esc(city.name) + (city.id === currentId ? ' <span class="badge">aktuell</span>' : '') + '</span>' +
        '<span class="coords">' + esc(city.coords || '') + '</span>' +
        '<span class="age ' + (stale ? 'stale' : '') + '">' +
          (city.updatedAt ? (stale ? 'veraltet · ' : 'Stand ') + M.formatAge(city.updatedAt, now) : 'noch nicht besucht') +
        '</span>' +
      '</a>';
    if (!city.updatedAt) {
      return '<section class="card empty">' + head +
        '<p class="hint">Öffne die Stadt einmal, dann erscheinen hier ihre Bestände.</p></section>';
    }
    var rows = M.RESOURCES.map(function (r) { return resourceRow(city, r, now); }).join('');
    return '<section class="card' + (stale ? ' is-stale' : '') + '">' + head + '<div class="res-list">' + rows + '</div></section>';
  }

  function summaryCard(cities, now) {
    var visited = cities.filter(function (c) { return c.updatedAt; });
    if (visited.length < 2) return '';
    var t = M.totals(visited, now);
    var cells = M.RESOURCES.map(function (r) {
      var rate = t.rate[r];
      return '<div class="sum-cell"><span class="res-name"><i class="dot dot-' + r + '"></i>' + M.LABELS[r] + '</span>' +
        '<strong>' + M.formatNumber(t.amount[r]) + '</strong>' +
        '<span class="rate ' + (rate < 0 ? 'neg' : rate > 0 ? 'pos' : '') + '">' + M.formatSigned(rate) + '/Std</span></div>';
    }).join('');
    return '<section class="card summary"><div class="card-title">Alle Städte (' + visited.length + ')</div>' +
      '<div class="sum-grid">' + cells + '</div></section>';
  }

  function render(world, settings, now, currentId) {
    var cities = (world.order || []).map(function (id) { return world.cities[id]; }).filter(Boolean);
    if (!cities.length) {
      return '<p class="hint big">Noch keine Daten. Wechsle im Spiel einmal durch deine Städte, ' +
        'dann füllt sich diese Übersicht von selbst.</p>';
    }
    return summaryCard(cities, now) + cities.map(function (c) { return cityCard(c, now, settings, currentId); }).join('');
  }

  return { render: render };
})();

// ---- src/features/military.js ----
/*
 * Militär-Übersicht: Truppen und Schiffe pro Stadt. Die Daten stammen aus der
 * Ansicht „Truppen in der Stadt“ (view=cityMilitary), sobald du sie öffnest.
 */
IKM.military = (function () {
  'use strict';

  var M = IKM.model;
  var esc = function (s) { return IKM.ui.esc(s); };

  function militaryLink(city) {
    return '?view=cityMilitary&activeTab=tabUnits&cityId=' + encodeURIComponent(city.id);
  }

  function list(title, items) {
    var visible = items.filter(function (u) { return u.count > 0; });
    if (!visible.length) return '<div class="mil-group"><div class="mil-title">' + title + '</div><p class="hint small">keine</p></div>';
    return '<div class="mil-group"><div class="mil-title">' + title + '</div><ul class="mil-list">' +
      visible.map(function (u) {
        return '<li><span>' + esc(u.name) + '</span><strong>' + M.formatNumber(u.count) + '</strong></li>';
      }).join('') + '</ul></div>';
  }

  function cityCard(city, now, settings) {
    var mil = city.military;
    var stale = mil && M.isStale({ updatedAt: mil.updatedAt }, now, settings.staleHours);
    var head = '<a class="card-head" href="' + militaryLink(city) + '" data-close>' +
      '<span class="city-name">' + esc(city.name) + '</span>' +
      '<span class="coords">' + esc(city.coords || '') + '</span>' +
      '<span class="age ' + (stale ? 'stale' : '') + '">' +
        (mil ? (stale ? 'veraltet · ' : 'Stand ') + M.formatAge(mil.updatedAt, now) : 'noch nicht erfasst') + '</span>' +
      '</a>';
    if (!mil) {
      return '<section class="card empty">' + head +
        '<p class="hint">Tippe auf die Stadt und öffne „Truppen in der Stadt“, dann erscheinen hier die Einheiten.</p></section>';
    }
    return '<section class="card' + (stale ? ' is-stale' : '') + '">' + head +
      '<div class="mil-cols">' + list('Truppen', mil.units || []) + list('Schiffe', mil.ships || []) + '</div></section>';
  }

  function totalsCard(cities) {
    var withMil = cities.filter(function (c) { return c.military; });
    if (withMil.length < 2) return '';
    var units = {}, ships = {};
    withMil.forEach(function (c) {
      (c.military.units || []).forEach(function (u) { units[u.name] = (units[u.name] || 0) + u.count; });
      (c.military.ships || []).forEach(function (u) { ships[u.name] = (ships[u.name] || 0) + u.count; });
    });
    var toList = function (o) { return Object.keys(o).map(function (k) { return { name: k, count: o[k] }; }); };
    return '<section class="card summary"><div class="card-title">Gesamt (' + withMil.length + ' Städte)</div>' +
      '<div class="mil-cols">' + list('Truppen', toList(units)) + list('Schiffe', toList(ships)) + '</div></section>';
  }

  function render(world, settings, now) {
    var cities = (world.order || []).map(function (id) { return world.cities[id]; }).filter(Boolean);
    if (!cities.length) return '<p class="hint big">Noch keine Städte erfasst.</p>';
    return totalsCard(cities) + cities.map(function (c) { return cityCard(c, now, settings); }).join('');
  }

  return { render: render };
})();

// ---- src/ui/panel.js ----
/*
 * Mobile Oberfläche: schwebender Button + Vollbild-Panel mit Tabs, komplett im
 * Shadow-DOM, damit weder Ikariam- noch ikaeasy-CSS hineinfunkt.
 */
IKM.ui = (function () {
  'use strict';

  var M = IKM.model;
  var host, shadow, layer, fab, panel, content, banner, tabs;
  var state = { open: false, tab: 'resources', copyStatus: '', confirmReset: false, debugText: '' };
  var settings;
  var tickTimer = null;

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
    '<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></svg>';

  function build() {
    host = document.createElement('div');
    host.id = 'ikariam-mobile-root';
    host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>' + IKM.css + '</style>' +
      '<div class="layer">' +
        '<button class="fab" type="button" aria-label="Ikariam Mobile öffnen">' + ICON + '<i class="alert-dot"></i></button>' +
        '<div class="panel" role="dialog" aria-label="Ikariam Mobile">' +
          '<div class="topbar"><h1>Übersicht</h1>' +
            '<button class="icon-btn" type="button" data-action="close" aria-label="Schließen">✕</button></div>' +
          '<div class="alert-banner" role="alert"><span>⚠ Angriff gemeldet!</span>' +
            '<a href="?view=militaryAdvisor" data-close>Militärberater öffnen</a></div>' +
          '<div class="tabs" role="tablist">' +
            '<button class="tab" role="tab" data-tab="resources">Ressourcen</button>' +
            '<button class="tab" role="tab" data-tab="military">Militär</button>' +
            '<button class="tab" role="tab" data-tab="settings">Einstellungen</button>' +
          '</div>' +
          '<div class="content"></div>' +
        '</div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(host);

    layer = shadow.querySelector('.layer');
    fab = shadow.querySelector('.fab');
    panel = shadow.querySelector('.panel');
    content = shadow.querySelector('.content');
    banner = shadow.querySelector('.alert-banner');
    tabs = shadow.querySelectorAll('.tab');

    fab.addEventListener('click', function () { setOpen(true); });
    shadow.addEventListener('click', onClick);
    shadow.addEventListener('change', onChange);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', position);
      window.visualViewport.addEventListener('scroll', position);
    }
    window.addEventListener('resize', position);
    window.addEventListener('orientationchange', function () { setTimeout(position, 300); });
  }

  /** Legt die Ebene genau über den sichtbaren Bereich und gleicht den Seiten-Zoom aus. */
  function position() {
    var v = IKM.viewport.visible();
    var w = v.width / v.scale;
    var h = v.height / v.scale;
    layer.style.left = v.left + 'px';
    layer.style.top = v.top + 'px';
    layer.style.width = w + 'px';
    layer.style.height = h + 'px';
    layer.style.transform = 'scale(' + v.scale + ')';
    layer.classList.toggle('wide', w >= 700);
  }

  function applySettings() {
    layer.setAttribute('data-theme', settings.theme);
    fab.classList.toggle('left', settings.fabSide === 'left');
    IKM.viewport.setFit(!!settings.fitViewport);
    setTimeout(position, 350);
  }

  function setOpen(open) {
    state.open = open;
    layer.classList.toggle('open', open);
    clearInterval(tickTimer);
    if (open) {
      position();
      render();
      tickTimer = setInterval(render, 30000); // Hochrechnung aktuell halten
    }
  }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-action],[data-tab],[data-close]') : null;
    if (!t) return;
    if (t.hasAttribute('data-tab')) {
      state.tab = t.getAttribute('data-tab');
      state.copyStatus = '';
      state.confirmReset = false;
      render();
      content.scrollTop = 0;
      return;
    }
    if (t.hasAttribute('data-close')) { setOpen(false); return; } // Link läuft normal weiter
    var action = t.getAttribute('data-action');
    if (action === 'close') setOpen(false);
    else if (action === 'copy-debug') copyDebug();
    else if (action === 'share-debug') shareDebug();
    else if (action === 'reset') {
      if (!state.confirmReset) { state.confirmReset = true; render(); return; }
      state.confirmReset = false;
      IKM.capture.resetWorld();
      IKM.capture.captureFromPage();
      state.copyStatus = 'Gespeicherte Daten gelöscht.';
      render();
    }
  }

  function onChange(e) {
    var el = e.target;
    var key = el.getAttribute && el.getAttribute('data-setting');
    if (!key) return;
    var val = el.type === 'checkbox' ? el.checked : el.value;
    if (key === 'staleHours') val = parseInt(val, 10) || 6;
    settings[key] = val;
    IKM.storage.saveSettings(settings);
    applySettings();
    render();
  }

  function copyDebug() {
    var text = IKM.capture.debugExport();
    state.debugText = text;
    var done = function (ok) {
      state.copyStatus = ok ? 'Rohdaten kopiert. Füge sie im Chat mit Claude ein.' :
        'Kopieren nicht erlaubt. Markiere den Text unten und kopiere ihn von Hand.';
      render();
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
        return;
      }
    } catch (e) { /* weiter mit Fallback */ }
    done(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function shareDebug() {
    var text = IKM.capture.debugExport();
    state.debugText = text;
    navigator.share({ title: 'Ikariam Mobile Debug', text: text }).catch(function () { /* abgebrochen */ });
    render();
  }

  function renderSettings() {
    var opt = function (val, label, cur) {
      return '<option value="' + val + '"' + (String(cur) === String(val) ? ' selected' : '') + '>' + label + '</option>';
    };
    return '' +
      '<section class="card">' +
        '<label class="setting"><span class="label">Seite an Bildschirmbreite anpassen' +
          '<small>Die ganze Spielseite passt ohne seitliches Scrollen auf den Bildschirm.</small></span>' +
          '<span class="switch"><input type="checkbox" data-setting="fitViewport"' + (settings.fitViewport ? ' checked' : '') + '><span></span></span></label>' +
        '<label class="setting"><span class="label">Darstellung</span>' +
          '<select data-setting="theme">' + opt('auto', 'Automatisch', settings.theme) + opt('light', 'Hell', settings.theme) + opt('dark', 'Dunkel', settings.theme) + '</select></label>' +
        '<label class="setting"><span class="label">Als veraltet markieren nach</span>' +
          '<select data-setting="staleHours">' + [1, 3, 6, 12, 24, 48].map(function (h) { return opt(h, h + ' Std', settings.staleHours); }).join('') + '</select></label>' +
        '<label class="setting"><span class="label">Button-Position</span>' +
          '<select data-setting="fabSide">' + opt('right', 'Rechts', settings.fabSide) + opt('left', 'Links', settings.fabSide) + '</select></label>' +
      '</section>' +
      '<section class="card">' +
        '<div class="card-title">Fehlersuche</div>' +
        '<p class="hint">Wenn Werte fehlen oder falsch sind: Rohdaten kopieren und an Claude schicken. ' +
          'Sicherheitsschlüssel (actionRequest) werden vorher entfernt.</p>' +
        '<div class="btn-row">' +
          '<button class="btn primary" type="button" data-action="copy-debug">Rohdaten kopieren</button>' +
          (navigator.share ? '<button class="btn" type="button" data-action="share-debug">Teilen</button>' : '') +
        '</div>' +
        '<div class="status">' + esc(state.copyStatus) + '</div>' +
        '<textarea class="debug' + (state.debugText ? ' show' : '') + '" readonly>' + esc(state.debugText) + '</textarea>' +
        '<div class="btn-row"><button class="btn danger" type="button" data-action="reset">' +
          (state.confirmReset ? 'Wirklich alle gespeicherten Daten löschen?' : 'Gespeicherte Daten löschen') + '</button></div>' +
      '</section>' +
      '<p class="footer-note">Ikariam Mobile ' + esc(IKM.VERSION) + ' · zeigt nur an, was Ikariam ohnehin lädt. ' +
        'Es werden keine Spielaktionen automatisch ausgeführt.</p>';
  }

  function render() {
    var world = IKM.capture.getWorld();
    var alert = world && world.alert && world.alert.active;
    fab.classList.toggle('has-alert', !!alert);
    banner.classList.toggle('show', !!alert);
    if (!state.open) return;
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute('aria-selected', tabs[i].getAttribute('data-tab') === state.tab ? 'true' : 'false');
    }
    var now = Date.now();
    var scroll = content.scrollTop;
    if (state.tab === 'resources') content.innerHTML = IKM.resources.render(world, settings, now, IKM.capture.currentCityId());
    else if (state.tab === 'military') content.innerHTML = IKM.military.render(world, settings, now);
    else content.innerHTML = renderSettings();
    content.scrollTop = scroll;
  }

  function start() {
    settings = IKM.storage.loadSettings();
    build();
    position();
    applySettings();
    IKM.capture.onChange(render);
    render();
  }

  return { start: start, esc: esc, render: render, open: function () { setOpen(true); } };
})();

// ---- src/main.js ----
/*
 * Einstieg. Wartet, bis Ikariam sein Seitenmodell geladen hat, und startet dann
 * Erfassung und Oberfläche. Läuft nur einmal pro Seite.
 */
(function () {
  'use strict';
  if (window.__ikariamMobile) return;
  window.__ikariamMobile = true;
  if (window.top !== window.self) return; // nicht in iframes

  function ready() {
    return document.body && (window.ikariam && window.ikariam.model || document.getElementById('GF_toolbar'));
  }

  var tries = 0;
  (function wait() {
    if (ready()) {
      try {
        IKM.capture.start();
        IKM.ui.start();
        window.IkariamMobile = IKM; // für Fehlersuche in der Konsole
      } catch (e) {
        if (window.console) console.error('[Ikariam Mobile]', e);
      }
      return;
    }
    if (++tries < 60) setTimeout(wait, 250);
  })();
})();

})();
