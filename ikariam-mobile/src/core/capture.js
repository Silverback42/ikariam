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
