#!/usr/bin/env node
// Fügt die Quelldateien zu einem Skript zusammen und erzeugt daraus
//   dist/ikariam-mobile.user.js   (Tampermonkey)
//   dist/ikariam-mobile.meta.js   (nur Header, für schnelle Update-Prüfung)
//   dist/extension/               (MV3-Erweiterung, Content-Script in world MAIN)
//   dist/ikariam-mobile-extension.zip
// Kein Bundler, keine Abhängigkeiten.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const REPO_RAW = 'https://raw.githubusercontent.com/Silverback42/ikariam/HEAD/ikariam-mobile/dist';
const MATCHES = ['https://*.ikariam.gameforge.com/*'];
const EXCLUDES = ['https://lobby.ikariam.gameforge.com/*'];

// Reihenfolge ist wichtig: spätere Dateien benutzen frühere.
export const SOURCES = [
  'src/core/model.js',
  'src/core/storage.js',
  'src/core/capture.js',
  'src/ui/viewport.js',
  'src/features/resources.js',
  'src/features/military.js',
  'src/ui/panel.js',
  'src/main.js',
];

export function bundle() {
  const css = readFileSync(join(root, 'src/ui/styles.css'), 'utf8');
  const parts = SOURCES.map((f) => `// ---- ${f} ----\n${readFileSync(join(root, f), 'utf8').trim()}\n`);
  return [
    '(function () {',
    "'use strict';",
    'var IKM = {};',
    `IKM.VERSION = ${JSON.stringify(VERSION)};`,
    `IKM.css = ${JSON.stringify(css)};`,
    ...parts,
    '})();',
    '',
  ].join('\n');
}

function userscriptHeader() {
  const lines = [
    ['name', 'Ikariam Mobile'],
    ['namespace', 'https://github.com/Silverback42/ikariam'],
    ['version', VERSION],
    ['description', 'Handy-taugliche Ressourcen- und Militär-Übersicht für Ikariam. Nur Anzeige, keine automatischen Aktionen.'],
    ...MATCHES.map((m) => ['match', m]),
    ...EXCLUDES.map((m) => ['exclude', m]),
    ['grant', 'none'],
    ['run-at', 'document-idle'],
    ['noframes', ''],
    ['updateURL', `${REPO_RAW}/ikariam-mobile.meta.js`],
    ['downloadURL', `${REPO_RAW}/ikariam-mobile.user.js`],
    ['supportURL', 'https://github.com/Silverback42/ikariam/issues'],
  ];
  const pad = Math.max(...lines.map(([k]) => k.length)) + 1;
  return ['// ==UserScript==', ...lines.map(([k, v]) => `// @${k.padEnd(pad)}${v}`.trimEnd()), '// ==/UserScript==', ''].join('\n');
}

function manifest() {
  return {
    manifest_version: 3,
    name: 'Ikariam Mobile',
    version: VERSION,
    description: 'Handy-taugliche Ressourcen- und Militär-Übersicht für Ikariam. Nur Anzeige, keine automatischen Aktionen.',
    content_scripts: [{
      matches: MATCHES,
      exclude_matches: EXCLUDES,
      js: ['ikariam-mobile.js'],
      run_at: 'document_idle',
      world: 'MAIN',
      all_frames: false,
    }],
  };
}

// --- minimaler ZIP-Schreiber (unkomprimiert), damit kein zip-Programm nötig ist ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const data = Buffer.from(content);
    const nameBuf = Buffer.from(name);
    const crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(0, 8); h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nameBuf.length, 26); h.writeUInt16LE(0, 28);
    local.push(h, nameBuf, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10); c.writeUInt16LE(0, 12); c.writeUInt16LE(0x21, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(0, 30); c.writeUInt32LE(0, 34); c.writeUInt32LE(0, 38);
    c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += h.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}

export function build() {
  const code = bundle();
  const dist = join(root, 'dist');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, 'extension'), { recursive: true });

  const header = userscriptHeader();
  writeFileSync(join(dist, 'ikariam-mobile.user.js'), header + '\n' + code);
  writeFileSync(join(dist, 'ikariam-mobile.meta.js'), header);

  const mf = JSON.stringify(manifest(), null, 2) + '\n';
  writeFileSync(join(dist, 'extension', 'manifest.json'), mf);
  writeFileSync(join(dist, 'extension', 'ikariam-mobile.js'), code);
  writeFileSync(join(dist, 'ikariam-mobile-extension.zip'),
    zip([['manifest.json', mf], ['ikariam-mobile.js', code]]));

  return { version: VERSION, bytes: code.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = build();
  console.log(`Ikariam Mobile ${r.version} gebaut (${(r.bytes / 1024).toFixed(1)} KB) -> dist/`);
}
