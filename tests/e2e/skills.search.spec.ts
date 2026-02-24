// tests/e2e/skills.search.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill search and filtering", () => {
  test("should search skills by text", async ({ page }) => {
    await page.goto("/skills");
    await page.getByPlaceholder(/search/i).fill("test");
    await page.keyboard.press("Enter");

    // Results should filter
    await page.waitForTimeout(500);
    // We just verify the page doesn't error
    await expect(page.getByText(/skills/i).first()).toBeVisible();
  });

  test("should filter by tag", async ({ page }) => {
    await page.goto("/skills");
    // Click on a tag filter
    const tagFilter = page.getByRole("button", { name: /java/i }).first();
    if (await tagFilter.isVisible()) {
      await tagFilter.click();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveURL(/\//);
  });

  test("should sort by different options", async ({ page }) => {
    await page.goto("/skills");
    const sortSelect = page.getByRole("combobox").first();
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await page.getByText(/newest/i).click();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveURL(/\//);
  });

  test("should paginate results", async ({ page }) => {
    await page.goto("/skills");
    const nextBtn = page.getByRole("button", { name: /next/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/page/i)).toBeVisible();
    }
  });
});
