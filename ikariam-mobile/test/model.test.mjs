// Tests für die reinen Berechnungen und Parser. Start: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (n) => JSON.parse(readFileSync(join(root, 'test/fixtures', n), 'utf8'));

// model.js und capture.js in einer Sandbox laden (ohne Browser).
const ctx = { IKM: {}, window: {}, location: { hostname: 'test', search: '' }, console };
vm.createContext(ctx);
for (const f of ['src/core/model.js', 'src/core/capture.js']) {
  vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
}
const M = ctx.IKM.model;
const C = ctx.IKM.capture;
const HOUR = 3600 * 1000;
const T0 = 1_764_000_000_000;

const city = (over = {}) => ({
  id: '1', name: 'Test', updatedAt: T0,
  resources: { wood: 1000, wine: 500, marble: 0, crystal: 0, sulfur: 0 },
  max: { wood: 2000, wine: 2000, marble: 2000, crystal: 2000, sulfur: 2000 },
  production: { wood: 100, wine: 0, marble: 0, crystal: 0, sulfur: 0 },
  wineSpendings: 50,
  ...over,
});

test('Hochrechnung: Bestand wächst mit der Produktionsrate', () => {
  assert.equal(M.projectAmount(city(), 'wood', T0), 1000);
  assert.equal(M.projectAmount(city(), 'wood', T0 + 3 * HOUR), 1300);
  assert.equal(M.projectAmount(city(), 'wood', T0 + 1.5 * HOUR), 1150);
});

test('Hochrechnung: nie über die Lagergröße, nie unter 0', () => {
  assert.equal(M.projectAmount(city(), 'wood', T0 + 100 * HOUR), 2000);
  assert.equal(M.projectAmount(city(), 'wine', T0 + 100 * HOUR), 0);
});

test('Hochrechnung: Bestand über dem Lager bleibt stehen', () => {
  const c = city({ resources: { wood: 2500, wine: 0, marble: 0, crystal: 0, sulfur: 0 } });
  assert.equal(M.projectAmount(c, 'wood', T0 + 5 * HOUR), 2500);
});

test('Lager voll in', () => {
  assert.equal(M.hoursUntilFull(city(), 'wood', T0), 10);
  assert.equal(M.hoursUntilFull(city(), 'wood', T0 + 4 * HOUR), 6);
  assert.equal(M.hoursUntilFull(city(), 'wood', T0 + 20 * HOUR), 0);
  assert.equal(M.hoursUntilFull(city(), 'marble', T0), null, 'ohne Produktion nie voll');
  assert.equal(M.hoursUntilFull(city({ max: {} }), 'wood', T0), null, 'ohne Lagerangabe unbekannt');
});

test('Wein reicht noch', () => {
  assert.equal(M.netRate(city(), 'wine'), -50);
  assert.equal(M.wineHoursLeft(city(), T0), 10);
  assert.equal(M.wineHoursLeft(city(), T0 + 2 * HOUR), 8);
  const winery = city({ production: { wood: 0, wine: 80, marble: 0, crystal: 0, sulfur: 0 } });
  assert.equal(M.wineHoursLeft(winery, T0), null, 'Überschuss: kein Ende');
  assert.equal(M.netRate(winery, 'wine'), 30);
});

test('Veraltet-Markierung', () => {
  assert.equal(M.isStale(city(), T0 + 5 * HOUR, 6), false);
  assert.equal(M.isStale(city(), T0 + 7 * HOUR, 6), true);
  assert.equal(M.isStale({}, T0, 6), true);
});

test('Summen über alle Städte', () => {
  const t = M.totals([city(), city({ id: '2' }), { id: '3' }], T0 + HOUR);
  assert.equal(t.amount.wood, 2200);
  assert.equal(t.rate.wine, -100);
});

test('Formatierung (deutsch)', () => {
  assert.equal(M.formatNumber(1234567), '1.234.567');
  assert.equal(M.formatNumber(-1500.4), '-1.500');
  assert.equal(M.formatSigned(250), '+250');
  assert.equal(M.formatHours(0.5), '30 Min');
  assert.equal(M.formatHours(5.2), '5 Std 12 Min');
  assert.equal(M.formatHours(50), '2 T 2 Std');
  assert.equal(M.formatHours(null), '–');
  assert.equal(M.formatAge(T0 - 3 * HOUR, T0), 'vor 3 Std');
  assert.equal(M.num('12.345'), 12.345);
});

test('ikariam.model wird normalisiert (Produktion pro Sekunde -> pro Stunde)', () => {
  const h = C.normalizeHeader(fixture('model.json'));
  assert.equal(h.cityId, '1001');
  assert.deepEqual({ ...h.resources }, { wood: 18250, wine: 4120, marble: 9800, crystal: 2100, sulfur: 7600 });
  assert.equal(h.max.wood, 32000);
  assert.equal(h.production.wood, 1800);
  assert.equal(h.production.marble, 900);
  assert.equal(h.production.wine, 0);
  assert.equal(h.wineSpendings, 1260);
  assert.deepEqual([...h.cityList].map((c) => c.name), ['Athen', 'Sparta', 'Korinth'], 'nur eigene Städte');
  assert.equal(h.cityList[0].coords, '[50:50]');
});

test('AJAX-Antwort: Kopfdaten und Angriffshinweis werden gefunden', () => {
  const payload = fixture('ajax-update.json');
  const header = C.findWithKey(payload, 'currentResources');
  const h = C.normalizeHeader(header);
  assert.equal(h.cityId, '1002');
  assert.equal(h.production.wine, 360);
  assert.equal(h.resources.wood, 30500);
  const adv = C.findWithKey(payload, 'advisors');
  assert.equal(C.alertFromClass(adv.advisors.military.cssclass).active, true);
  assert.equal(C.alertFromClass('normalactive').active, false);
  assert.equal(C.alertFromClass('premium').active, false);
});

test('Fehlende Felder werden toleriert', () => {
  assert.equal(C.normalizeHeader({}), null);
  assert.equal(C.normalizeHeader(null), null);
  const h = C.normalizeHeader({ currentResources: { resource: '1200' }, maxResources: 5000 });
  assert.equal(h.resources.wood, 1200);
  assert.equal(h.resources.wine, 0, 'fehlender Wert -> 0');
  assert.equal(h.max.sulfur, 5000, 'eine Zahl gilt für alle Lager');
  assert.equal(h.cityId, null);
});

test('Debug-Export entfernt Sicherheitsschlüssel', () => {
  const s = C.sanitize(fixture('model.json'));
  assert.equal(s.actionRequest, '[entfernt]');
  assert.equal(s.currentResources.resource, 18250);
});
