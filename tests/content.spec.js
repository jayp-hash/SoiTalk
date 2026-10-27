// House rules for everything a learner reads (no browser needed).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..', 'app');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(f.name)) files.push(p); } })(APP);

// Code with comments removed, so notes to ourselves don't count
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');

test('no em dashes in anything a learner reads', () => {
  const hits = files.flatMap((f) => code(fs.readFileSync(f, 'utf8')).split('\n').map((l, i) => (l.includes('—') ? `${path.relative(APP, f)}:${i + 1}` : null)).filter(Boolean));
  expect(hits).toEqual([]);
});

test('never "coming soon" or "coming next"', () => {
  const hits = files.filter((f) => /coming (soon|next)/i.test(code(fs.readFileSync(f, 'utf8')))).map((f) => path.relative(APP, f));
  expect(hits).toEqual([]);
});

test('every lesson has the parts a lesson needs', () => {
  const src = fs.readFileSync(path.join(APP, 'lib', 'scenes.js'), 'utf8');
  const ids = [...src.slice(src.indexOf('export const SCENES')).matchAll(/^ {2}(?:'([\w-]+)'|(\w+)): \{$/gm)].map((m) => m[1] || m[2]);
  expect(ids.length).toBeGreaterThanOrEqual(7);
  for (const key of ['mission', 'teaser']) {
    const n = (src.match(new RegExp(`^\\s{4}${key}:`, 'gm')) || []).length;
    expect(n, `every lesson has a ${key}`).toBeGreaterThanOrEqual(ids.length);
  }
});

// Classifiers: every noun has a real classifier, a picture and romanization; no em dashes.
test('classifiers data is complete', async () => {
  const fs = require('fs'); const path = require('path');
  // The data file is an ES module; load it as plain JS for this check
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'classifiers.js'), 'utf8').replace(/^export /gm, '');
  const { CLASSIFIERS, NOUNS, SAY, CONFUSE } = new Function(`${src}; return { CLASSIFIERS, NOUNS, SAY, CONFUSE };`)();
  const cls = new Set(CLASSIFIERS.map((c) => c.th));
  expect(CLASSIFIERS.length).toBeGreaterThanOrEqual(10);
  for (const n of NOUNS) {
    expect(cls.has(n.cls), `${n.th} has an unknown classifier`).toBe(true);
    expect(n.rom && n.en, `${n.th} needs romanization and English`).toBeTruthy();
    expect(fs.existsSync(path.join(__dirname, '..', 'public', 'classifiers', `${n.img}.webp`)), `${n.th} picture`).toBe(true);
  }
  for (const c of CLASSIFIERS) expect(NOUNS.filter((n) => n.cls === c.th && n.practice !== false).length, `${c.th} needs at least 3 practice nouns`).toBeGreaterThanOrEqual(3);
  for (const c of CLASSIFIERS) expect(c.group && c.unit, `${c.th} needs a group and a unit`).toBeTruthy();
  // Every noun has an everyday sentence that uses it with its own classifier
  for (const n of NOUNS) {
    const say = SAY[n.th];
    expect(say, `${n.th} needs a sentence`).toBeTruthy();
    expect(say.parts.find((x) => x.role === 'noun')?.th, `${n.th} sentence noun`).toBe(n.th);
    expect(say.parts.find((x) => x.role === 'cls')?.th, `${n.th} sentence classifier`).toBe(n.cls);
    expect(say.parts.every((x) => x.th && x.rom), `${n.th} sentence romanization`).toBe(true);
    expect(say.en, `${n.th} sentence English`).toBeTruthy();
  }
  for (const c of CLASSIFIERS) expect(CONFUSE[c.th]?.length, `${c.th} look-alikes`).toBeGreaterThan(0);
  expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'classifiers.js'), 'utf8')).not.toContain('—');
});

// Romanization: the same Thai word is spelled one way across lessons, patterns and the word list.
// Words already spelled two ways wait in tests/romanization-known.json for Jay to pick one.
// Full list any time: node tests/romanization.js
// The "er" rule (Jay, 27 Oct): เดิน dern, เงิน ngern, เจอ jer; เ-ย is oei (เคย khoei, เลย loei).
// No romanization anywhere (course, Say it today, word list, sentences) may use the old oe spelling.
test('the er sound is written er everywhere', () => {
  const { collect } = require('./romanization');
  const pairs = collect();
  const old = pairs.filter((p) => /o\p{M}*e(?!\p{M}*i)/u.test(p.rom.normalize('NFD')));
  expect(old.map((p) => `${p.th} ${p.rom} (${p.where})`), 'Use er (dern), or oei for เ-ย (khoei)').toEqual([]);
  const has = (th, rom) => pairs.some((p) => p.th === th && p.rom === rom);
  expect(has('เดิน', 'dern') || pairs.some((p) => p.rom.split(' ').includes('dern'))).toBe(true);
});

test('every Thai word is romanized one way', async ({}, testInfo) => {
  const { collect, conflicts, report } = require('./romanization');
  const pairs = collect();
  // The check really reads the content (not an empty scan)
  expect(pairs.length, 'Thai words with romanization found').toBeGreaterThan(1000);
  expect(pairs.some((p) => p.th === 'สวัสดี' && p.rom === 'sà-wàt-dii' && p.where.startsWith('word list'))).toBe(true);
  expect(pairs.some((p) => p.where.startsWith('app/lib/scenes.js'))).toBe(true);
  expect(pairs.some((p) => p.where.startsWith('app/lib/patterns.js'))).toBe(true);

  const list = conflicts();
  await testInfo.attach('romanization.txt', { body: report(list), contentType: 'text/plain' });
  const known = JSON.parse(fs.readFileSync(path.join(__dirname, 'romanization-known.json'), 'utf8'));
  const fresh = list.filter((c) => !known[c.th] || c.spellings.some((s) => !known[c.th].includes(s.rom)));
  expect(fresh, `New Thai words romanized two ways. Use one spelling, or add them to tests/romanization-known.json for Jay:\n${report(fresh)}\n`).toEqual([]);
  const fixed = Object.keys(known).filter((th) => th !== '_note' && !list.some((c) => c.th === th));
  expect(fixed, 'Now spelled one way everywhere: delete these from tests/romanization-known.json').toEqual([]);
});

// Spellings Jay picked: the "oi" sound is written oi (nói, à-ròi, soi), and เดียว diao, แก้ว gâaew, ตั๋ว dtǔaa, อันนี้ an-níi,
// เลี้ยวซ้าย líaao sáai, วินมอเตอร์ไซค์ win maaw-dtoe-sai.
test('romanization follows the spellings Jay picked', () => {
  const { collect } = require('./romanization');
  const old = /([aàáâǎ])a?w[iy](?![\p{L}\p{M}])|(?<![\p{L}\p{M}])(diaao|gâaeo|dtǔa)(?![\p{L}\p{M}])|(?<![\p{L}\p{M}-])(an níi|líaao-sáai|win-maaw-dtoe-sai)(?![\p{L}\p{M}])/u;
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'db.json'), 'utf8'));
  const hits = [
    ...collect().filter((p) => old.test(p.rom)).map((p) => `${p.th} ${p.rom} (${p.where})`),
    ...db.sentences.filter((s) => old.test(s.romanization || '')).map((s) => `${s.thai} ${s.romanization} (word list sentence #${s.id})`),
    ...files.flatMap((f) => (f.includes(`${path.sep}data${path.sep}`) ? [] : code(fs.readFileSync(f, 'utf8')).split('\n').map((l, i) => (old.test(l) ? `${path.relative(APP, f)}:${i + 1}` : null)).filter(Boolean))),
  ];
  expect(hits, 'Old spellings (náawi, à-ràwi, saawy, diaao, gâaeo, dtǔa, an níi, líaao-sáai, win-maaw-dtoe-sai)').toEqual([]);
});

// Every sentence pattern level builds a sentence, every time (a bad random pick once left Going places L3 blank)
test('every pattern level always builds a sentence', async () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'patterns.js'), 'utf8').replace(/^export /gm, '');
  const { LADDERS, swapValue } = new Function(`${src}; return { LADDERS, swapValue };`)();
  for (const p of LADDERS) for (const level of p.levels) for (let i = 0; i < 300; i++) {
    const v = level.random();
    const s = level.make(v);
    expect(s.parts.length, `${p.id} L${level.n}`).toBeGreaterThan(1);
    expect(s.parts.every((x) => x.th), `${p.id} L${level.n}: empty word`).toBe(true);
    expect(s.en, `${p.id} L${level.n}: English`).toMatch(/^[A-Z].*[.?]$/);
    // Swapping any coloured word gives a sentence too
    for (const key of [...new Set(s.parts.map((x) => x.key).filter(Boolean))]) {
      const nv = swapValue(p.id, v, key);
      if (nv) expect(level.make(nv).parts.every((x) => x.th), `${p.id} L${level.n} swap ${key}`).toBe(true);
    }
  }
});
