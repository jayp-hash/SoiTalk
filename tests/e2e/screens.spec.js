// Every main screen, at every size: no sideways scroll, nothing sticking out,
// and the main button visible without scrolling (ui-principles 5 and 6).
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems, returningLearner, day } = require('../helpers');

// Today's lesson already done (the café lesson today)
const lessonDone = returningLearner(undefined, { 'tsc-scenes': { '7eleven': day(2), restaurant: day(1), cafe: day(0) } });

const CTA = '.pt-check, .st-cta, a.today-start, button.today-start, .auth-btn.primary, .lp-cta';
const SCREENS = [
  ['landing', '/', null],
  ['today (new visitor)', '/today', null],
  ['today (returning learner)', '/today', returningLearner()],
  ['words', '/vocabulary', returningLearner()],
  ['words (lesson done today)', '/vocabulary', lessonDone],
  ['patterns', '/patterns', returningLearner()],
  ['classifiers', '/classifiers', null],
  ['classifiers matching', '/classifiers?mode=practice&act=match&level=1', null],
  ['classifiers how many', '/classifiers?mode=practice&act=slots&level=3', null],
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

// The Word library banner matches Today: one finish line a day (backlog: Journey 1, G3)
test('words banner says done for today once the lesson is done', async ({ page }) => {
  await preparePage(page, lessonDone);
  await page.goto('/vocabulary');
  const banner = page.locator('.tp-start');
  await expect(banner).toContainText('Done for today ✓');
  await expect(banner).toContainText('Tomorrow:');
  await expect(banner).not.toContainText('Next up');
  await expect(banner).not.toContainText('Continue on Today');
  await page.goto('/today');
  await expect(page.locator('.today-donecard')).toContainText('Done for today ✓');
});

test('words banner still points to today before the lesson', async ({ page }) => {
  await preparePage(page, returningLearner());
  await page.goto('/vocabulary');
  await expect(page.locator('.tp-start')).toContainText('Continue on Today');
  await expect(page.locator('.tp-start')).toContainText('Next up');
});

test('words banner says done on day 1, right after the first lesson', async ({ page }) => {
  await preparePage(page, returningLearner(undefined, { 'tsc-first-session': { scene: '7eleven', made: ['ถุง'], day: day(0) }, 'tsc-scenes': { '7eleven': day(0) } }));
  await page.goto('/vocabulary');
  await expect(page.locator('.tp-start')).toContainText('Done for today ✓');
  await expect(page.locator('.tp-start')).toContainText('Tomorrow:');
});
