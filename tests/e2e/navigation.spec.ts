// tests/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigation and branding', () => {
  test('app title should be Skills', async ({ page }) => {
    await page.goto('/skills');
    // Sidebar brand link should say "Skills"
    await expect(page.getByRole('link', { name: 'Skills' }).first()).toBeVisible();
  });

  test('home page should redirect to /skills', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/skills');
    await expect(page).toHaveURL(/\/skills/);
  });

  test('sidebar should not show Home link', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForTimeout(500);
    // Home link should not exist in sidebar
    const homeLink = page.getByRole('link', { name: /^home$/i });
    await expect(homeLink).not.toBeVisible();
  });

  test('sidebar should show Discover link', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForTimeout(500);
    await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible();
  });

  test('header should not have search input', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForTimeout(500);
    // Header search was removed; only skills page search exists
    const headerSearch = page.locator('header').getByRole('searchbox');
    await expect(headerSearch).not.toBeVisible();
  });

  test('skills page should have search input', async ({ page }) => {
    await page.goto('/skills');
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder('Search skills...')).toBeVisible();
  });

  test('file tree should use Lucide icons not emoji', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    await page.waitForTimeout(500);
    // If a file tree is visible, it should use SVG icons (not emoji)
    const fileTree = page.locator('.min-w-48');
    if (await fileTree.isVisible()) {
      const svgCount = await fileTree.locator('svg').count();
      expect(svgCount).toBeGreaterThan(0);
    }
  });
});
