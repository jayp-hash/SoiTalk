// Shared helpers for the Soi Talk browser tests.
const fs = require('fs');
const path = require('path');

const TONE = fs.readFileSync(path.join(__dirname, 'fixtures', 'tone.mp3'));
// A 0.4 second clip for the lesson walk: the walk checks layout, not sound, and the
// conversation plays every line, so the full 2 second tone made each lesson wait ~10 seconds.
const SHORT_TONE = fs.readFileSync(path.join(__dirname, 'fixtures', 'tone-short.mp3'));

// The screen sizes every check runs at: two phones and two laptop windows.
const SIZES = {
  phone: { width: 390, height: 844 },
  smallPhone: { width: 360, height: 640 },
  laptop: { width: 964, height: 653 },
  desktop: { width: 1440, height: 800 },
};

// Every lesson, read from app/lib/scenes.js so new lessons are tested automatically.
function lessonIds() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'scenes.js'), 'utf8');
  const start = src.indexOf('export const SCENES');
  return [...src.slice(start).matchAll(/^ {2}(?:'([\w-]+)'|([\w]+)): \{$/gm)].map((m) => m[1] || m[2]);
}

// The local date, like the app's dayKey (an ISO/UTC date broke the tests between midnight and 7am in Bangkok)
const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// A returning learner: the first lesson two days ago, a few words met.
function returningLearner(words = ['ไม่', 'เอา', 'ถุง', 'ใบเสร็จ', 'ช้อน', 'ค่ะ', 'ขอ', 'น้ำเปล่า', 'ขวด', 'สอง', 'สาม', 'ฉัน', 'ชอบ', 'กิน', 'กาแฟ', 'แก้ว', 'คุณ', 'เขา', 'นอน'], extra = {}) {
  const now = Date.now();
  return {
    'tsc-first-session': { scene: '7eleven', made: ['ถุง'], day: day(2) },
    'tsc-scenes': { '7eleven': day(2), restaurant: day(1) },
    'tsc-register-chosen': true,
    'tsc-tour-vocab': true,
    'tsc-memory': Object.fromEntries(words.map((w) => [w, { s: 1, d: 5, last: now - 86400000, seen: now - 86400000, intro: now - 2 * 86400000, due: now - 3600000, checks: 1, lapses: 0, longest: 0, got: 1 }])),
    'tsc-days': { [day(1)]: { reviewed: 5, done: true }, [day(2)]: { reviewed: 5, done: true } },
    ...extra,
  };
}

// Prepare a page: silent audio, optional saved progress (set once, before the first load).
// { shortAudio: true } swaps every clip for a 0.4 second one.
async function preparePage(page, store = null, { shortAudio = false } = {}) {
  const body = shortAudio ? SHORT_TONE : TONE;
  await page.route('**/api/speak**', (r) => r.fulfill({ status: 200, body, headers: { 'content-type': 'audio/mpeg' } }));
  if (store) {
    await page.addInitScript((s) => {
      if (sessionStorage.getItem('seeded')) return;
      try { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); sessionStorage.setItem('seeded', '1'); } catch (e) { /* private mode */ }
    }, store);
  }
}

// Wait until the screen has stopped moving: every entrance animation and transition has
// finished (endless ones, like a pulsing play button, are ignored). Never longer than maxMs.
// Faster than a fixed pause, and it still waits as long as a slow animation needs.
async function settle(page, maxMs = 1500) {
  await page.evaluate(async (max) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await frame();
    const finite = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime !== Infinity);
    await Promise.race([Promise.all(finite.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, max))]);
    await frame();
  }, maxMs);
}

// Layout checks used everywhere. Returns a list of problems (empty = fine).
async function layoutProblems(page, ctaSelector) {
  return page.evaluate((sel) => {
    const W = innerWidth; const H = innerHeight; const out = [];
    if (document.documentElement.scrollWidth > W) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px wide)`);
    for (const e of document.querySelectorAll('body *')) {
      const b = e.getBoundingClientRect();
      if (!b.width || getComputedStyle(e).position === 'fixed') continue;
      if (b.right > W + 1 || b.left < -1) {
        let clipped = false;
        for (let a = e.parentElement; a; a = a.parentElement) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) { clipped = true; break; } }
        if (!clipped) { out.push(`sticks out: ${String(e.className || e.tagName).slice(0, 40)}`); break; }
      }
    }
    if (sel) {
      const c = [...document.querySelectorAll(sel)].find((e) => { const b = e.getBoundingClientRect(); return b.width && getComputedStyle(e).visibility !== 'hidden'; });
      if (c) { const b = c.getBoundingClientRect(); if (b.bottom > H + 1) out.push(`main button below the screen (${Math.round(b.bottom)} > ${H}): "${c.innerText.slice(0, 30)}"`); }
    }
    return out;
  }, ctaSelector);
}

module.exports = { SIZES, lessonIds, returningLearner, preparePage, settle, layoutProblems, day };
