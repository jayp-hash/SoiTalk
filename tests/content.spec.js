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

// Counting words: every noun has a real classifier, a picture and romanization; no em dashes.
test('counting words data is complete', async () => {
  const fs = require('fs'); const path = require('path');
  // The data file is an ES module; load it as plain JS for this check
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'classifiers.js'), 'utf8').replace(/^export /gm, '');
  const { CLASSIFIERS, NOUNS } = new Function(`${src}; return { CLASSIFIERS, NOUNS };`)();
  const cls = new Set(CLASSIFIERS.map((c) => c.th));
  expect(CLASSIFIERS).toHaveLength(10);
  for (const n of NOUNS) {
    expect(cls.has(n.cls), `${n.th} has an unknown classifier`).toBe(true);
    expect(n.rom && n.en, `${n.th} needs romanization and English`).toBeTruthy();
    expect(fs.existsSync(path.join(__dirname, '..', 'public', 'classifiers', `${n.img}.webp`)), `${n.th} picture`).toBe(true);
  }
  for (const c of CLASSIFIERS) expect(NOUNS.filter((n) => n.cls === c.th).length, `${c.th} needs at least 3 nouns`).toBeGreaterThanOrEqual(3);
  expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'classifiers.js'), 'utf8')).not.toContain('—');
});
