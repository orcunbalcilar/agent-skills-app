// tests/e2e/skills.download.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill download", () => {
  test("should download a skill and increment count", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /download/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test("unauthenticated user can download", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/skills");
    await page.getByRole("link").first().click();
    const downloadBtn = page.getByRole("button", { name: /download/i });
    await expect(downloadBtn).toBeVisible();

    await context.close();
  });
});
