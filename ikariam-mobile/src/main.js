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
