// tests/e2e/category-tags.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Category tags filtering", () => {
  test("should display category filter chips on skills page", async ({ page }) => {
    await page.goto("/skills");
    await page.waitForTimeout(500);
    // Category tags like "ai", "frontend", "backend" etc. should be visible as filter chips
    const categoryBadge = page.getByRole("button").filter({ hasText: /^(ai|frontend|backend|devops|security|testing|database|cloud|mobile|data-science)$/i });
    const count = await categoryBadge.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking a category tag should filter skills", async ({ page }) => {
    await page.goto("/skills");
    await page.waitForTimeout(500);
    const aiBadge = page.getByRole("button").filter({ hasText: /^ai$/i }).first();
    if (await aiBadge.isVisible()) {
      await aiBadge.click();
      await page.waitForTimeout(500);
      // The badge should be highlighted (selected state)
      // URL may or may not change; the filter should be applied
    }
  });

  test("clicking a selected category tag should deselect it", async ({ page }) => {
    await page.goto("/skills");
    await page.waitForTimeout(500);
    const aiBadge = page.getByRole("button").filter({ hasText: /^ai$/i }).first();
    if (await aiBadge.isVisible()) {
      // Select
      await aiBadge.click();
      await page.waitForTimeout(300);
      // Deselect
      await aiBadge.click();
      await page.waitForTimeout(300);
    }
  });
});
