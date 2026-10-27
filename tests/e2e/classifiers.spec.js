// Classifiers tab (rebuilt 27 Oct): Learn opens each classifier, and every Practice
// activity can be played through at phone and laptop sizes without anything sticking out.
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems } = require('../helpers');

const practice = async (page, size, act = 'match', level = 1) => {
  await page.setViewportSize(size);
  await preparePage(page);
  await page.goto(`/classifiers?mode=practice&act=${act}&level=${level}`);
  await expect(page.locator(act === 'slots' ? '.cl-cabinet' : '.cl-arena')).toBeVisible();
};
// Tap the tile that the next gap wants, until the sentence is built
const buildIt = async (page) => {
  for (let i = 0; i < 8 && !(await page.locator('.cl-built').isVisible()); i++) {
    const want = await page.locator('.px-slot.is-next').getAttribute('data-want');
    await page.locator(`.cl-tile:not(.is-used)[data-th="${want}"]`).first().click();
  }
  await expect(page.locator('.cl-built')).toBeVisible();
};

test('Learn: intro, every classifier, open one and get a sentence', async ({ page }) => {
  await page.setViewportSize(SIZES.phone);
  await preparePage(page);
  await page.goto('/classifiers');
  await expect(page.locator('.cl-intro')).toBeVisible();
  const rows = page.locator('.cl-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(14);
  for (const k of [0, 5, 13]) {
    await rows.nth(k).click();
    await expect(page.locator('.cl-open .cl-noun').first()).toBeVisible();
    await page.locator('.cl-open .cl-noun').last().click();
    await expect(page.locator('.cl-say .pm-tile.is-slot')).toBeVisible();
    const broken = await page.locator('.cl-open img, .cl-row-img').evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).length);
    expect(broken).toBe(0);
  }
  // The intro has folded into a strip once a classifier was opened
  await expect(page.locator('.cl-intro-strip')).toBeVisible();
  expect(await layoutProblems(page, null)).toEqual([]);
});

for (const [sizeName, size] of [['phone', SIZES.phone], ['smallPhone', SIZES.smallPhone], ['laptop', SIZES.laptop]]) {
  test(`Find the matches L1: fill the circle, build the sentence (${sizeName})`, async ({ page }) => {
    await practice(page, size);
    expect(await layoutProblems(page, null)).toEqual([]);
    const target = await page.locator('.cl-circle').getAttribute('data-cls');
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

test('Find the matches: drag a card into the circle', async ({ page }) => {
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

for (const level of [2, 3]) {
  test(`Find the matches L${level}: sort into two circles`, async ({ page }) => {
    await practice(page, SIZES.phone, 'match', level);
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
}

// Set every reel with the nudge buttons until it shows the wanted item, then pull
async function serve(page) {
  await expect(page.locator('.cl-nudge').first()).toBeEnabled({ timeout: 3000 });
  const reels = page.locator('.cl-reel');
  for (let k = 0; k < await reels.count(); k++) {
    const reel = reels.nth(k);
    const want = await reel.getAttribute('data-want');
    for (let i = 0; i < 8 && (await reel.getAttribute('data-cur')) !== want; i++) await reel.locator('.cl-nudge').last().click();
    expect(await reel.getAttribute('data-cur')).toBe(want);
  }
  await page.getByRole('button', { name: 'Pull the lever' }).click();
}

for (const [sizeName, size] of [['phone', SIZES.phone], ['smallPhone', SIZES.smallPhone], ['laptop', SIZES.laptop]]) {
  test(`How many? L1: five customers to the finish (${sizeName})`, async ({ page }) => {
    await practice(page, size, 'slots', 1);
    expect(await layoutProblems(page, '.cl-pull')).toEqual([]);
    for (let c = 0; c < 5; c++) {
      await serve(page);
      await expect(page.locator('.cl-reel.is-right').first()).toBeVisible();
      await page.locator('.cl-pull').click();
    }
    await expect(page.locator('.cl-finish')).toBeVisible();
    await expect(page.locator('.cl-marquee.is-jackpot')).toBeVisible();
  });
}

test('How many? L3: three reels, a wrong pull shows a hint, the answer works', async ({ page }) => {
  await practice(page, SIZES.phone, 'slots', 3);
  await expect(page.locator('.cl-reel')).toHaveCount(3);
  await expect(page.locator('.cl-nudge').first()).toBeEnabled({ timeout: 3000 });
  await page.getByRole('button', { name: 'Pull the lever' }).click(); // every reel starts wrong
  await expect(page.locator('.cl-reel.is-wrong').first()).toBeVisible();
  await expect(page.locator('.cl-hint.on')).toBeVisible();
  await serve(page);
  await expect(page.locator('.cl-reel.is-right')).toHaveCount(3);
});

test('How many? reels work with the keyboard', async ({ page }) => {
  await practice(page, SIZES.laptop, 'slots', 2);
  await expect(page.locator('.cl-nudge').first()).toBeEnabled({ timeout: 3000 });
  const win = page.locator('.cl-reel-win').first();
  const before = await page.locator('.cl-reel').first().getAttribute('data-cur');
  await win.focus(); await page.keyboard.press('ArrowDown');
  expect(await page.locator('.cl-reel').first().getAttribute('data-cur')).not.toBe(before);
});
