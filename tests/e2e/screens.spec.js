// Every main screen, at every size: no sideways scroll, nothing sticking out,
// and the main button visible without scrolling (ui-principles 5 and 6).
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems, returningLearner } = require('../helpers');

const CTA = '.pt-check, .st-cta, a.today-start, button.today-start, .auth-btn.primary, .lp-cta';
const SCREENS = [
  ['landing', '/', null],
  ['today (new visitor)', '/today', null],
  ['today (returning learner)', '/today', returningLearner()],
  ['words', '/vocabulary', returningLearner()],
  ['patterns', '/patterns', returningLearner()],
  ['counting words', '/classifiers', null],
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
