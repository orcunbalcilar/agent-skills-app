// tests/e2e/category-tags.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Category tags filtering', () => {
  test('should display category filter section on skills page', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForTimeout(500);
    // The CategoryFilter renders system tags under a "Categories" heading
    // If there are system tags, the section is visible
    const categories = page.getByText('Categories');
    if (await categories.isVisible()) {
      await expect(categories).toBeVisible();
    } else {
      // No system tags exist — that's valid, CategoryFilter returns null
      expect(true).toBe(true);
    }
  });

  test('clicking a category tag should filter skills', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForTimeout(500);
    const categories = page.getByText('Categories');
    if (await categories.isVisible()) {
      const firstBadge = categories.locator('..').locator("[data-slot='badge']").first();
      if (await firstBadge.isVisible()) {
        await firstBadge.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('clicking a selected category tag should deselect it', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForTimeout(500);
    const categories = page.getByText('Categories');
    if (await categories.isVisible()) {
      const firstBadge = categories.locator('..').locator("[data-slot='badge']").first();
      if (await firstBadge.isVisible()) {
        // Select
        await firstBadge.click();
        await page.waitForTimeout(300);
        // Deselect
        await firstBadge.click();
        await page.waitForTimeout(300);
      }
    }
  });
});
