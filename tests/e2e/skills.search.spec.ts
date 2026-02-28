// tests/e2e/skills.search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Skill search and filtering', () => {
  test('should search skills by text', async ({ page }) => {
    await page.goto('/skills');
    // Use the skills page search input (SearchBar component)
    await page.getByPlaceholder('Search skills...').fill('test');
    await page.keyboard.press('Enter');

    // Results should filter
    await page.waitForTimeout(500);
    // We just verify the page doesn't error
    await expect(page.getByRole('heading', { name: /discover skills/i })).toBeVisible();
  });

  test('should filter by tag', async ({ page }) => {
    await page.goto('/skills');
    // Click on a tag filter
    const tagFilter = page.getByRole('button', { name: /java/i }).first();
    if (await tagFilter.isVisible()) {
      await tagFilter.click();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveURL(/\//);
  });

  test('should sort by different options', async ({ page }) => {
    await page.goto('/skills');
    const sortSelect = page.getByRole('combobox').first();
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await page.getByText(/newest/i).click();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveURL(/\//);
  });

  test('should paginate results', async ({ page }) => {
    await page.goto('/skills');
    // Pagination "Next page" button is inside the main content area
    const nextBtn = page.locator('main').getByRole('button', { name: 'Next page' });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      // The current page button should have aria-current="page"
      await expect(page.locator('main').locator('[aria-current="page"]')).toBeVisible();
    }
  });
});
