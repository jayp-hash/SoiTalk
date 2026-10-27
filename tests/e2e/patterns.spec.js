// Patterns tab (rebuilt 27 Oct): tap a coloured word to swap it, the new patterns,
// and a Practice round played to the end for every pattern, at phone size.
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems, returningLearner } = require('../helpers');

const open = async (page, size = SIZES.phone) => {
  await page.setViewportSize(size);
  await preparePage(page, returningLearner());
  await page.goto('/patterns');
  await expect(page.locator('.pm-card')).toBeVisible();
};
const pickPattern = async (page, id) => {
  const sel = page.locator('.pm-pick-pattern select');
  if (await sel.isVisible()) await sel.selectOption(id);
  else await page.locator('.pm-side-i', { hasText: { go: 'Going places', price: 'Asking prices', like: 'Likes', order: 'Ordering' }[id] }).click();
};

test('Learn: tapping a coloured word swaps just that word', async ({ page }) => {
  await open(page);
  const tile = page.locator('.pm-tile.is-swap').first();
  await expect(tile).toBeVisible();
  const before = await page.locator('.pm-sentence').innerText();
  await tile.click();
  await expect.poll(async () => page.locator('.pm-sentence').innerText()).not.toBe(before);
  expect(await layoutProblems(page, null)).toEqual([]);
});

for (const id of ['go', 'price']) {
  test(`Learn: the new pattern "${id}" builds sentences at every level`, async ({ page }) => {
    await open(page);
    await pickPattern(page, id);
    for (const n of [1, 2, 3]) {
      await page.locator('.pm-pick-level select').selectOption(String(n));
      await expect(page.locator('.pm-sentence .pm-tile').first()).toBeVisible();
      await page.locator('.pm-shuffle').click();
      await expect(page.locator('.pm-en')).not.toHaveText(/^\s*$/);
    }
  });
}

for (const [id, lvl] of [['like', 1], ['order', 1], ['go', 1], ['price', 1], ['go', 3], ['price', 3], ['like', 3]]) {
  test(`Practice: a full round of "${id}" level ${lvl} to the finish`, async ({ page }) => {
    await open(page);
    await pickPattern(page, id);
    await page.locator('.pm-pick-level select').selectOption(String(lvl));
    await page.locator('.pm-mode:visible button', { hasText: 'Practice' }).click();
    await page.locator('.px-sound').click(); // sound off: lines don't wait for audio
    for (let step = 0; step < 40 && !(await page.locator('.px-end').isVisible()); step++) {
      if (await page.locator('.px-opt[data-ok]').isVisible()) { await page.locator('.px-opt[data-ok]').click(); continue; }
      const next = page.locator('.px-slot.is-next');
      if (await next.isVisible()) {
        const want = await next.getAttribute('data-want');
        await page.locator(`.px-tile:not(.is-used)[data-th="${want}"]`).first().click();
        // At least 3 more tiles than gaps
        const tiles = await page.locator('.px-tile').count(); const gaps = await page.locator('.px-slot.is-gap').count();
        expect(tiles - gaps).toBeGreaterThanOrEqual(3);
        continue;
      }
      await page.waitForTimeout(300);
    }
    await expect(page.locator('.px-end')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Today' })).toBeVisible();
  });
}

test('Practice fits a small phone', async ({ page }) => {
  await open(page, SIZES.smallPhone);
  await page.locator('.pm-mode:visible button', { hasText: 'Practice' }).click();
  await expect(page.locator('.px-you')).toBeVisible();
  expect(await layoutProblems(page, null)).toEqual([]);
});
