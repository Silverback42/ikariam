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
