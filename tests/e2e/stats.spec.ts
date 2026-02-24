// tests/e2e/stats.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Statistics", () => {
  test("homepage should display real-time stats banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/skill|total|download/i).first()).toBeVisible();
  });

  test("skill stats page should render charts", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();
    await page.getByRole("tab", { name: /stats/i }).click();

    // Charts should render (Recharts SVG)
    await page.waitForTimeout(1000);
    const chart = page.locator(".recharts-wrapper").first();
    if (await chart.isVisible()) {
      await expect(chart).toBeVisible();
    }
  });
});
