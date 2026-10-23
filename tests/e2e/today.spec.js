// A returning learner's practice on Today: words, the sentence-pattern block and the
// progress pop-up. Checks the page never jumps when you answer, and the pop-up closes
// back onto Today ("one finish line a day").
const { test, expect } = require('@playwright/test');
const { SIZES, preparePage, layoutProblems, returningLearner, day } = require('../helpers');

const lessonDone = returningLearner(undefined, { 'tsc-scenes': { '7eleven': day(2), restaurant: day(1), cafe: day(0) } });

for (const sizeName of ['phone', 'laptop']) {
  test(`practice session on a ${sizeName}`, async ({ page }) => {
    await page.setViewportSize(SIZES[sizeName]);
    await preparePage(page, lessonDone);
    await page.goto('/today');
    await page.locator('button:has-text("Practise words"), button.today-start').first().click();
    const jumps = [];
    let sawPattern = false;
    for (let i = 0; i < 90; i++) {
      if (await page.locator('.pp').count()) break;
      if (await page.locator('.pt-shuffle').count()) {
        sawPattern = true;
        expect(await layoutProblems(page, '.pt-check')).toEqual([]);
        for (let k = 0; k < 3; k++) { await page.locator('.pt-shuffle').click(); await page.waitForTimeout(200); }
        await page.locator('.pt-check').click(); await page.waitForTimeout(600); continue;
      }
      if (await page.locator('.ck-opt:enabled').count()) {
        const y0 = await page.evaluate(() => scrollY);
        const first = page.locator('.ck-opt').first();
        const b0 = (await first.boundingBox()).y;
        await first.click(); await page.waitForTimeout(500);
        const y1 = await page.evaluate(() => scrollY);
        const b1 = (await first.boundingBox()).y;
        if (y0 !== y1 || Math.abs(b0 - b1) > 1) jumps.push(`answer moved the page (scroll ${y0}->${y1}, option ${Math.round(b0)}->${Math.round(b1)})`);
        await page.locator('.ck-result .auth-btn').click(); await page.waitForTimeout(500); continue;
      }
      if (await page.locator('.fc-rate-btn').count()) {
        if (!(await page.locator('.fc-rate-btn:visible').count())) { await page.locator('.fc-card, .fc-stage').first().click({ force: true }); await page.waitForTimeout(300); }
        await page.locator('.fc-rate-btn').last().click({ force: true }); await page.waitForTimeout(400); continue;
      }
      const btn = page.locator('main button.auth-btn.primary:visible, main .rv-go:visible');
      if (await btn.count()) { await btn.first().click(); await page.waitForTimeout(600); continue; }
      throw new Error('Stuck: no button to press in the practice session');
    }
    expect(jumps).toEqual([]);
    expect(sawPattern, 'the sentence-pattern block should appear for this learner').toBe(true);
    await expect(page.locator('.pp')).toBeVisible();
    await page.getByRole('button', { name: 'See you tomorrow' }).click();
    await expect(page.locator('.pp')).toHaveCount(0);
    await expect(page.locator('.today-donecard')).toBeVisible();
  });
}
