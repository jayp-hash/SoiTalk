// Every main screen, at every size: no sideways scroll, nothing sticking out,
// and the main button visible without scrolling (ui-principles 5 and 6).
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems, returningLearner, day } = require('../helpers');

const CTA = '.pt-check, .st-cta, a.today-start, button.today-start, .auth-btn.primary, .lp-cta';
const SCREENS = [
  ['landing', '/', null],
  ['today (new visitor)', '/today', null],
  ['today (returning learner)', '/today', returningLearner()],
  ['words', '/vocabulary', returningLearner()],
  ['words (lesson done today)', '/vocabulary', returningLearner(undefined, { 'tsc-scenes': { '7eleven': day(2), restaurant: day(1), cafe: day(0) } })],
  ['patterns', '/patterns', returningLearner()],
  ['sign in', '/signin', null],
  ['first lesson', '/start', null],
];

for (const [name, path, store] of SCREENS) {
  for (const [sizeName, size] of Object.entries(SIZES)) {
    test(`${name} fits a ${sizeName} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await preparePage(page, store);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      expect(await layoutProblems(page, CTA)).toEqual([]);
    });
  }
}

// The Word library banner agrees with Today (ui-principles 12: one finish line a day).
test('words banner says done once today\'s lesson is done', async ({ page }) => {
  await preparePage(page, returningLearner(undefined, { 'tsc-scenes': { '7eleven': day(2), restaurant: day(1), cafe: day(0) } }));
  await page.goto('/vocabulary');
  await expect(page.locator('.tp-start-title')).toHaveText('Done for today ✓');
  await expect(page.locator('.tp-start-sub')).not.toContainText('Next up');
  await expect(page.locator('.tp-start-sub')).toContainText(/^Tomorrow: .+, about \d+ minutes\.$/);
});

test('words banner offers a review day once every lesson is done', async ({ page }) => {
  const all = Object.fromEntries(['7eleven', 'restaurant', 'cafe', 'stall', 'market', 'stuck', 'where', 'taxi', 'smalltalk', 'bargain'].map((id) => [id, day(1)]));
  await preparePage(page, returningLearner(undefined, { 'tsc-scenes': { ...all, bargain: day(0) } }));
  await page.goto('/vocabulary');
  await expect(page.locator('.tp-start-title')).toHaveText('Done for today ✓');
  await expect(page.locator('.tp-start-sub')).toHaveText('Tomorrow: a review day. New lessons arrive every week.');
});

test('words banner points to Today when the lesson is not done', async ({ page }) => {
  await preparePage(page, returningLearner());
  await page.goto('/vocabulary');
  await expect(page.locator('.tp-start-title')).toHaveText('Continue on Today');
});
