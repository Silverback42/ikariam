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
