// Counting words (classifiers): Learn shows all 10, and both Practice activities can be played
// through on a phone without anything sticking out (ui-principles 5 and 6).
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems } = require('../helpers');

test('Learn shows the 10 counting words with pictures', async ({ page }) => {
  await page.setViewportSize(SIZES.phone);
  await preparePage(page);
  await page.goto('/classifiers');
  await expect(page.locator('.cl-card')).toHaveCount(10);
  const broken = await page.locator('.cl-noun img').evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).length);
  expect(broken).toBe(0);
});

for (const [sizeName, size] of [['phone', SIZES.phone], ['smallPhone', SIZES.smallPhone], ['laptop', SIZES.laptop]]) {
  test(`Find the matches: a full round on a ${sizeName}`, async ({ page }) => {
    await page.setViewportSize(size);
    await preparePage(page);
    await page.goto('/classifiers');
    await page.locator('.pm-mode:visible button', { hasText: 'Practice' }).click();
    for (let c = 0; c < 3; c++) {
      await expect(page.locator('.cl-circle')).toBeVisible();
      expect(await layoutProblems(page, null)).toEqual([]);
      const target = await page.locator('.cl-circle-th').innerText();
      void target;
      const pics = page.locator('.cl-pic');
      const n = await pics.count();
      for (let i = 0; i < n && !(await page.locator('.cl-next').isVisible()); i++) {
        const p = pics.nth(i);
        if (await p.isDisabled()) continue;
        await p.click();
      }
      await expect(page.locator('.cl-next')).toBeVisible();
      await page.locator('.cl-next').click();
    }
    await expect(page.locator('.cl-done')).toBeVisible();
  });
}

test('Say what you see: build and check a phrase', async ({ page }) => {
  await page.setViewportSize(SIZES.phone);
  await preparePage(page);
  await page.goto('/classifiers');
  await page.locator('.pm-mode:visible button', { hasText: 'Practice' }).click();
  await page.locator('.cl-pickers select').first().selectOption('build');
  await expect(page.locator('.cl-reel')).toHaveCount(3);
  expect(await layoutProblems(page, '.cl-next')).toEqual([]);
  // Spin each reel until Check turns everything green (at most 4 options per reel)
  for (let tries = 0; tries < 70 && !(await page.locator('.cl-answer').isVisible()); tries++) {
    await page.locator('.cl-next').click();
    for (const k of [0, 1, 2]) {
      const reel = page.locator('.cl-reel').nth(k);
      if ((await reel.getAttribute('class')).includes('wrong')) { await reel.locator('.cl-reel-b').last().click(); break; }
    }
  }
  await expect(page.locator('.cl-answer')).toBeVisible();
});
