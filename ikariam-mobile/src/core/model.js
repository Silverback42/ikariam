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
