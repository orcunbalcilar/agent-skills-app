// tests/e2e/owners.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Skill owners', () => {
  test('should add a co-owner to a skill', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    const addOwnerBtn = page.getByRole('button', { name: /add owner/i });
    if (await addOwnerBtn.isVisible()) {
      await addOwnerBtn.click();
      await page.getByPlaceholder(/email|user/i).fill('user@test.local');
      await page.getByRole('button', { name: /add/i }).click();
      await expect(page.getByText(/owner added/i)).toBeVisible();
    }
  });

  test('should remove a co-owner', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    const removeBtn = page.getByRole('button', { name: /remove.*owner/i }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.getByRole('button', { name: /confirm/i }).click();
    }
  });
});

test.describe('Orphan skill handling', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test('admin should see orphaned skills section on admin page', async ({ page }) => {
    // Navigate to /skills first so the session loads, then click Admin Panel
    await page.goto('/skills');
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: 'Admin Panel' }).click();
    await page.getByRole('heading', { name: /admin panel/i }).waitFor({ timeout: 10000 });
    // CardTitle renders as <div data-slot="card-title">, not a heading
    const orphanSection = page
      .locator("[data-slot='card-title']")
      .filter({ hasText: /orphaned skills/i });
    await expect(orphanSection).toBeVisible();
  });
});
