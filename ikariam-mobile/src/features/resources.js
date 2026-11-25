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
