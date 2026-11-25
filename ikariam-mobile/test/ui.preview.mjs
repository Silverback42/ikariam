// Lädt das gebaute Userscript in eine nachgestellte Ikariam-Seite und macht
// Handy-Screenshots (Pixel 7). Start: npm run preview
// Prüft: Panel öffnet sich, Karten stimmen, AJAX-Update wird übernommen,
// Militär wird erfasst, Viewport-Schalter entfernt das seitliche Scrollen.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.SHOT_DIR || join(root, 'docs', 'screenshots');
mkdirSync(out, { recursive: true });

const read = (p) => readFileSync(join(root, p), 'utf8');
const ORIGIN = 'https://s1-de.ikariam.gameforge.com';
const model = JSON.parse(read('test/fixtures/model.json'));
const page = read('test/fixtures/mock-page.html').replace('__MODEL__', JSON.stringify(model));
const script = read('dist/ikariam-mobile.user.js');
const ajax = read('test/fixtures/ajax-update.json');
const militaryHtml = read('test/fixtures/military.html');
const militaryResponse = JSON.stringify([
  ['updateGlobalData', JSON.parse(ajax)[0][1]],
  ['changeView', ['cityMilitary', militaryHtml, {}]],
]);

const browser = await chromium.launch();
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FEHLER', name + ': ' + e.message]); }
};

async function run(colorScheme) {
  const context = await browser.newContext({ ...devices['Pixel 7'], colorScheme });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
  const p = await context.newPage();
  p.on('pageerror', (e) => results.push(['FEHLER', 'Seitenfehler: ' + e.message]));
  await p.route(ORIGIN + '/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/__ikariam-mobile.user.js') return route.fulfill({ body: script, contentType: 'text/javascript' });
    if (url.searchParams.get('mock') === 'switch') return route.fulfill({ body: ajax, contentType: 'application/json' });
    if (url.searchParams.get('mock') === 'military') return route.fulfill({ body: militaryResponse, contentType: 'application/json' });
    return route.fulfill({ body: page, contentType: 'text/html' });
  });
  await p.goto(ORIGIN + '/index.php');
  await p.waitForFunction(() => window.IkariamMobile);
  const shot = (n) => p.screenshot({ path: join(out, `${n}${colorScheme === 'dark' ? '-dunkel' : ''}.png`) });
  const root = p.locator('#ikariam-mobile-root');

  if (colorScheme === 'light') await shot('0-seite-ohne-anpassung');

  await check(`[${colorScheme}] Button ist mindestens 44px groß (auf dem Bildschirm)`, async () => {
    const size = await p.evaluate(() => {
      const fab = document.querySelector('#ikariam-mobile-root').shadowRoot.querySelector('.fab');
      const r = fab.getBoundingClientRect();
      const vv = window.visualViewport;
      return (r.width / vv.width) * screen.width; // Breite in Geräte-CSS-Pixeln
    });
    assert.ok(size >= 44, 'Button nur ' + size.toFixed(1) + 'px');
  });

  await root.locator('.fab').click();
  await check(`[${colorScheme}] Panel öffnet sich mit Ressourcen-Karten`, async () => {
    await root.locator('.panel').waitFor({ state: 'visible' });
    const names = await root.locator('.card .city-name').allInnerTexts();
    assert.deepEqual(names.map((n) => n.replace(/\s*aktuell$/, '').trim()), ['Athen', 'Sparta', 'Korinth']);
    const athen = root.locator('.card').filter({ hasText: 'Athen' });
    assert.match(await athen.innerText(), /18\.250/);
    assert.match(await athen.innerText(), /\+1\.800\/Std/);
    assert.match(await athen.innerText(), /reicht 3 Std/);
  });
  await shot('1-ressourcen');

  await check(`[${colorScheme}] Simulierte AJAX-Antwort aktualisiert Sparta und zeigt den Angriff`, async () => {
    await root.locator('[data-action="close"]').click();
    await p.evaluate(() => window.mockAjax('/index.php?mock=switch'));
    await p.waitForTimeout(400);
    await root.locator('.fab').click();
    const sparta = root.locator('.card').filter({ hasText: 'Sparta' });
    assert.match(await sparta.innerText(), /30\.500/);
    assert.match(await sparta.innerText(), /aktuell/);
    assert.ok(await root.locator('.alert-banner.show').isVisible(), 'Angriffs-Banner fehlt');
    assert.ok(await sparta.locator('.fill-full').count() >= 1, 'Holz bei 95 % sollte rot sein');
  });
  await shot('2-nach-stadtwechsel-angriff');

  await check(`[${colorScheme}] Militär wird aus der Truppenansicht erfasst`, async () => {
    await p.evaluate(() => window.mockAjax('/index.php?mock=military'));
    await p.waitForTimeout(400);
    await root.locator('[data-tab="military"]').click();
    const sparta = root.locator('.card').filter({ hasText: 'Sparta' });
    const text = await sparta.innerText();
    assert.match(text, /Hoplit\s*120/);
    assert.match(text, /Bogenschütze\s*1\.250/);
    assert.match(text, /Rammschiff\s*8/);
    assert.doesNotMatch(text, /Schwertkämpfer/, 'Einheiten mit 0 werden ausgeblendet');
  });
  await shot('3-militaer');

  await root.locator('[data-tab="settings"]').click();
  await check(`[${colorScheme}] Debug-Export ohne Sicherheitsschlüssel`, async () => {
    await root.locator('[data-action="copy-debug"]').click();
    await p.waitForTimeout(200);
    const text = await root.locator('textarea.debug').inputValue();
    assert.match(text, /currentResources/);
    assert.doesNotMatch(text, /geheim123|neu456/);
  });
  await shot('4-einstellungen');

  if (colorScheme === 'light') {
    await check('Viewport-Schalter: kein seitliches Scrollen mehr', async () => {
      await root.locator('[data-setting="fitViewport"]').check();
      await p.waitForTimeout(600);
      const after = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(after <= 1, 'immer noch ' + after + 'px seitlich scrollbar');
      const meta = await p.evaluate(() => document.querySelector('meta[name=viewport]')?.content);
      assert.match(meta || '', /^width=1100\b/, 'Viewport-Tag: ' + meta);
    });
    await root.locator('[data-action="close"]').click();
    await p.waitForTimeout(300);
    await shot('5-seite-angepasst');
    await check('Panel bleibt nach dem Anpassen lesbar groß', async () => {
      await root.locator('.fab').click();
      await root.locator('[data-tab="resources"]').click();
      const fontPx = await p.evaluate(() => {
        const sr = document.querySelector('#ikariam-mobile-root').shadowRoot;
        const el = sr.querySelector('.city-name');
        const r = el.getBoundingClientRect();
        return (r.height / window.visualViewport.width) * screen.width;
      });
      assert.ok(fontPx >= 18, 'Stadtname nur ' + fontPx.toFixed(1) + 'px hoch');
    });
    await shot('6-panel-nach-anpassung');
  }
  await context.close();
}

await run('light');
await run('dark');
await browser.close();

for (const [s, m] of results) console.log(`${s.padEnd(6)} ${m}`);
console.log(`Screenshots: ${out}`);
if (results.some(([s]) => s !== 'ok')) process.exit(1);
