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
