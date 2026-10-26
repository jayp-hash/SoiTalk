// Finds Thai words that are romanized two (or more) ways across the app.
// Looks at lessons, patterns, classifiers, Say it today and every other file in app/,
// plus the word list and its sentences (the copy in tests/fixtures/db.json).
// Limits: whole sentences are not split into words (Thai has no spaces), so a spelling used only
// inside a full sentence is counted in the report but not flagged on its own.
// Run on its own for a readable list: node tests/romanization.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const THAI = /[฀-๿]/;
// One string literal: '...', "..." or `...`
const STR = String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|` + '`(?:[^`\\\\]|\\\\.)*`';
// Looks like romanization: letters, tone marks, spaces, hyphens; short
const ROMAN = /^[\p{Script=Latin}\p{M}' -]{1,40}$/u;

// Code with comments removed, so notes to ourselves don't count
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');
// The text inside a string literal. Template strings with ${...} are built at run time, so skip them.
const text = (s) => (s[0] === '`' && s.includes('${') ? null : s.slice(1, -1).replace(/\\(.)/g, '$1').trim());

function collect() {
  const pairs = [];
  const add = (th, rom, where) => {
    if (!th || !rom || !THAI.test(th) || THAI.test(rom) || !ROMAN.test(rom)) return;
    pairs.push({ th, rom, where });
  };

  const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(f.name)) files.push(p); } })(APP);
  const key = (names) => new RegExp(String.raw`(?:^|[\s{,])['"]?(?:${names})['"]?\s*:\s*(${STR})`);
  const TH_KEY = key('th|thai');
  const ROM_KEY = key('rom|roman|romanization');
  const MAP_ENTRY = new RegExp(String.raw`(${STR})\s*:\s*(${STR})`, 'g');
  const W_CALL = new RegExp(String.raw`\bW\(\s*(${STR})\s*,\s*(${STR})\s*\)`, 'g');

  for (const f of files) {
    if (f.startsWith(path.join(APP, 'data'))) continue; // old prototype list, not used by any screen
    const src = code(fs.readFileSync(f, 'utf8'));
    const rel = path.relative(ROOT, f);
    const line = (i) => src.slice(0, i).split('\n').length;
    // { th: 'ไทย', rom: 'thai' } in any order, innermost braces first
    let s = src;
    for (let found = true; found;) {
      found = false;
      s = s.replace(/\{[^{}]*\}/g, (blk, at) => {
        found = true;
        const th = blk.match(TH_KEY);
        const rom = blk.match(ROM_KEY);
        if (th && rom) add(text(th[1]), text(rom[1]), `${rel}:${line(at)}`);
        // Lookup tables: { 'ไทย': 'thai' }
        for (const m of blk.matchAll(MAP_ENTRY)) add(text(m[1]), text(m[2]), `${rel}:${line(at)}`);
        return blk.replace(/[^\n]/g, ' ');
      });
    }
    // W('ไทย', 'thai')
    for (const m of src.matchAll(W_CALL)) add(text(m[1]), text(m[2]), `${rel}:${line(m.index)}`);
  }

  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'db.json'), 'utf8'));
  for (const w of db.vocabulary) add(w.thai, w.romanization, `word list: ${w.thai} (#${w.id})`);
  for (const s of db.sentences) for (const w of s.words || []) add(w.th, w.rom, `word list sentence #${s.id}`);
  return pairs;
}

// Whole sentences are not split word by word (Thai has no spaces to split on), so for each
// spelling we also count how often it appears inside full sentence romanization.
function inSentences(rom) {
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'db.json'), 'utf8'));
  const app = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(f.name) && !p.startsWith(path.join(APP, 'data'))) app.push(code(fs.readFileSync(p, 'utf8'))); } })(APP);
  const esc = rom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  const re = new RegExp(`(?<![\\p{L}\\p{M}-])${esc}(?![\\p{L}\\p{M}-])`, 'giu');
  const n = (t) => (t.match(re) || []).length;
  return db.sentences.reduce((a, x) => a + n(x.romanization || ''), 0) + app.reduce((a, t) => a + n(t), 0);
}

// [{ th, spellings: [{ rom, count, where: [...] }] }] for every Thai word with more than one spelling.
// Capital letters and extra spaces don't count as a different spelling.
function conflicts() {
  const by = new Map();
  for (const p of collect()) {
    const norm = p.rom.toLowerCase().replace(/\s+/g, ' ');
    if (!by.has(p.th)) by.set(p.th, new Map());
    const spellings = by.get(p.th);
    if (!spellings.has(norm)) spellings.set(norm, []);
    spellings.get(norm).push(p.where);
  }
  return [...by].filter(([, sp]) => sp.size > 1).map(([th, sp]) => ({
    th,
    spellings: [...sp].map(([rom, where]) => ({ rom, count: where.length, where: [...new Set(where)], text: inSentences(rom) })).sort((a, b) => b.count - a.count),
  })).sort((a, b) => a.th.localeCompare(b.th, 'th'));
}

function report(list = conflicts()) {
  if (!list.length) return 'Every Thai word is romanized one way.';
  const looks = (r) => r.replace(/[\s-]/g, '');
  return list.map((c) => `${c.th}${new Set(c.spellings.map((s) => looks(s.rom))).size === 1 ? '  (only a hyphen or space differs)' : ''}\n${c.spellings.map((s) => `  ${s.rom}  (${s.count}x as a word, ${s.text}x anywhere in sentences and app text: ${s.where.slice(0, 3).join(', ')}${s.where.length > 3 ? ', ...' : ''})`).join('\n')}`).join('\n');
}

module.exports = { collect, conflicts, report };
if (require.main === module) console.log(report());
