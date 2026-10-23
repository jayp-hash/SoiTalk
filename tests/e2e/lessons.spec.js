// Walks every lesson from start to the Done screen, and on every step checks that
// the main button can be seen without scrolling and nothing sticks out sideways.
const { test, expect } = require('@playwright/test');
const { SIZES, lessonIds, preparePage, layoutProblems, day } = require('../helpers');

const LESSONS = lessonIds();
// Every lesson on a phone; a few on the small phone and the laptop window to keep the run short.
const RUNS = [
  ...LESSONS.map((id) => [id, 'phone']),
  ...LESSONS.filter((_, i) => i % 3 === 1).map((id) => [id, 'smallPhone']),
  ...LESSONS.filter((_, i) => i % 3 === 2).map((id) => [id, 'laptop']),
];

const store = { 'tsc-register-chosen': true, 'tsc-first-session': { scene: '7eleven', made: ['ถุง', 'หลอด', 'ช้อน'], day: day(1) } };

async function title(page) {
  for (let i = 0; i < 15; i++) {
    if (await page.locator('.dn').count()) return 'done';
    const t = page.locator('.st-title');
    if (await t.count()) return (await t.first().innerText()).trim();
    await page.waitForTimeout(300);
  }
  return 'done';
}

for (const [id, sizeName] of RUNS) {
  test(`lesson ${id} on a ${sizeName}`, async ({ page }) => {
    const size = SIZES[sizeName];
    await page.setViewportSize(size);
    await preparePage(page, store);
    await page.goto(id === '7eleven' ? '/start' : `/start/${id}`);
    const problems = [];
    const check = async (step) => {
      await page.waitForTimeout(700); // let entrance animations settle
      for (const p of await layoutProblems(page, '.st-cta, .dn-save .st-cta')) problems.push(`${step}: ${p}`);
    };
    const cta = () => page.locator('.st-cta:visible').first();
    let steps = 0;
    for (let guard = 0; guard < 60; guard++) {
      const t = await title(page);
      if (t === 'done') { await check('done'); break; }
      steps++;
      if (t === 'Remember this?') {
        await check('recall');
        for (let i = 0; i < 8 && await page.locator('.st-cta:disabled').count(); i++) {
          const bank = page.locator('.st-bank .st-tile');
          if (!(await bank.count())) break;
          await bank.first().click();
        }
        await cta().click(); await check('recall answered'); await cta().click();
      } else if (t === 'The conversation') {
        await check('conversation');
        await cta().click();
        for (let i = 0; i < 40; i++) { const ct = await cta().innerText(); if (/Next|said/.test(ct)) break; await page.waitForTimeout(500); }
        await check('conversation played'); await cta().click();
      } else if (t.startsWith('Word by word') || t.includes('little words')) {
        await check('word by word'); await cta().click();
      } else if (t === 'Now make your own') {
        await check('make your own');
        for (let i = 0; i < 2; i++) { await page.locator('.st-bubble.is-swap, .st-tile.is-swap').first().click({ force: true }); await page.waitForTimeout(900); }
        await check('make your own done'); await cta().click();
      } else if (t.startsWith('What')) {
        await check(`question (${t})`);
        await page.locator('.st-opt').first().click();
        await check(`question answered (${t})`); await cta().click();
      } else {
        throw new Error(`Unknown lesson step: "${t}"`);
      }
    }
    expect(steps, 'the lesson should have steps').toBeGreaterThan(3);
    expect(problems).toEqual([]);
  });
}
