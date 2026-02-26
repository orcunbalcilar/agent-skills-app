// tests/e2e/stats.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Statistics", () => {
  test("homepage should display real-time stats banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/skill|total|download/i).first()).toBeVisible();
  });

  test("skill detail page should show stats tab", async ({ page }) => {
    await page.goto("/skills");
    await page.locator("main a[href^='/skills/']").first().click();
    // Wait for navigation to complete
    await page.waitForURL(/\/skills\/[^/]+$/);
    // Wait for the tabs to be loaded
    await page.waitForSelector("role=tab", { timeout: 10000 });
    // The Stats tab should be visible in the skill detail
    const statsTab = page.getByRole("tab", { name: /stats/i });
    await expect(statsTab).toBeVisible();
    await statsTab.click();
    await page.waitForTimeout(500);
    // Stats content should show downloads count or loading message
    const statsContent = page.getByText(/download|loading stats/i).first();
    await expect(statsContent).toBeVisible();
  });
});
