// Classifiers tab (rebuilt 24 Oct): Learn opens each classifier, and every Practice
// activity can be played through at phone and laptop sizes without anything sticking out.
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems } = require('../helpers');

const practice = async (page, size) => {
  await page.setViewportSize(size);
  await preparePage(page);
  await page.goto('/classifiers');
  await page.locator('.pm-mode:visible button', { hasText: 'Practice' }).click();
};
const pickLevel = async (page, n) => {
  const sel = page.locator('.pm-pick select:visible').filter({ has: page.locator('option[value="3"]') }).first();
  await sel.selectOption(String(n));
};
// Tap the tile that the next gap wants, until the sentence is built
const buildIt = async (page) => {
  for (let i = 0; i < 8 && !(await page.locator('.cl-built').isVisible()); i++) {
    const want = await page.locator('.px-slot.is-next').getAttribute('data-want');
    await page.locator(`.cl-tile:not(.is-used)[data-th="${want}"]`).first().click();
  }
  await expect(page.locator('.cl-built')).toBeVisible();
};

test('Learn: intro, 10 classifiers, open one and get a sentence', async ({ page }) => {
  await page.setViewportSize(SIZES.phone);
  await preparePage(page);
  await page.goto('/classifiers');
  await expect(page.locator('.cl-intro')).toBeVisible();
  await expect(page.locator('.cl-row')).toHaveCount(10);
  for (const k of [0, 6]) {
    await page.locator('.cl-row').nth(k).click();
    await expect(page.locator('.cl-open .cl-noun').first()).toBeVisible();
    await page.locator('.cl-open .cl-noun').last().click();
    await expect(page.locator('.cl-say .pm-tile.is-slot')).toBeVisible();
    const broken = await page.locator('.cl-open img').evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).length);
    expect(broken).toBe(0);
  }
  expect(await layoutProblems(page, null)).toEqual([]);
});

for (const [sizeName, size] of [['phone', SIZES.phone], ['smallPhone', SIZES.smallPhone], ['laptop', SIZES.laptop]]) {
  test(`Find the matches L1: fill the circle, build the sentence (${sizeName})`, async ({ page }) => {
    await practice(page, size);
    await expect(page.locator('.cl-circle')).toBeVisible();
    expect(await layoutProblems(page, null)).toEqual([]);
    const target = await page.locator('.cl-circle').getAttribute('data-cls');
    // One wrong tap shows a hint and keeps the picture out
    await page.locator(`.cl-pic:not([data-cls="${target}"])`).first().click();
    await expect(page.locator('.cl-strip.is-hint')).toBeVisible();
    const rights = page.locator(`.cl-pic[data-cls="${target}"]`);
    const n = await rights.count();
    for (let i = 0; i < n; i++) await rights.nth(i).click();
    await expect(page.locator('.cl-build')).toBeVisible({ timeout: 5000 });
    expect(await layoutProblems(page, null)).toEqual([]);
    await buildIt(page);
    await page.getByRole('button', { name: 'Try a new classifier' }).click();
    await expect(page.locator('.cl-circle')).toBeVisible();
  });
}

test('Find the matches: drag a picture into the circle', async ({ page }) => {
  await practice(page, SIZES.phone);
  const target = await page.locator('.cl-circle').getAttribute('data-cls');
  const pic = page.locator(`.cl-pic[data-cls="${target}"]`).first();
  const a = await pic.boundingBox(); const c = await page.locator('.cl-circle').boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.cl-circle-in img')).toHaveCount(1);
  await expect(page.locator('.cl-strip.is-say')).toBeVisible();
});

test('Find the matches L2: sort into two circles', async ({ page }) => {
  await practice(page, SIZES.phone);
  await pickLevel(page, 2);
  await expect(page.locator('.cl-circle')).toHaveCount(2);
  expect(await layoutProblems(page, null)).toEqual([]);
  const pics = page.locator('.cl-pic');
  const n = await pics.count();
  for (let i = 0; i < n; i++) {
    const p = pics.nth(i);
    const cls = await p.getAttribute('data-cls');
    await p.click();
    await page.locator(`.cl-circle[data-cls="${cls}"]`).click();
  }
  await expect(page.locator('.cl-build')).toBeVisible({ timeout: 5000 });
  await buildIt(page);
});

test('Find the matches L3: build the phrase from a picture', async ({ page }) => {
  await practice(page, SIZES.phone);
  await pickLevel(page, 3);
  await expect(page.locator('.cl-scene')).toBeVisible();
  expect(await layoutProblems(page, null)).toEqual([]);
  await buildIt(page);
  await page.getByRole('button', { name: 'Next picture' }).click();
  await expect(page.locator('.cl-bank')).toBeVisible();
});

for (const [sizeName, size] of [['phone', SIZES.phone], ['laptop', SIZES.laptop]]) {
  test(`Slot machine: spin and stop every reel on the picture (${sizeName})`, async ({ page }) => {
    await practice(page, size);
    const pickAct = page.locator('.cl-pickers select:visible');
    if (await pickAct.count()) await pickAct.first().selectOption('slots');
    else await page.getByRole('button', { name: 'Slot machine' }).click();
    await expect(page.locator('.cl-reel')).toHaveCount(3);
    expect(await layoutProblems(page, null)).toEqual([]);
    await page.locator('.cl-spin').click();
    for (const k of [0, 1, 2]) {
      const reel = page.locator('.cl-reel').nth(k);
      const want = await reel.getAttribute('data-want');
      await expect.poll(async () => reel.getAttribute('data-cur'), { timeout: 8000, intervals: [40] }).toBe(want);
      await reel.click();
    }
    await expect(page.locator('.cl-jackpot')).toBeVisible();
  });
}
