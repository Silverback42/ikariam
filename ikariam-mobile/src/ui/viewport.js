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
