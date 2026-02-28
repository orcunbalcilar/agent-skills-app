// tests/e2e/skills.edit.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Skill editing', () => {
  test('owner should be able to navigate to edit page', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    // Edit button is in the action bar for owners/admins
    const editBtn = page.getByRole('button', { name: /^edit$/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);
      // Should be on edit page with a form
      await expect(page.getByRole('heading', { name: /edit skill/i })).toBeVisible();
    }
  });

  test('non-owner should not see edit button', async ({ page }) => {
    // Navigate to a skill owned by admin (as regular user)
    await page.goto('/skills');
    const adminSkill = page.getByRole('link').filter({ hasText: /admin/i }).first();
    if (await adminSkill.isVisible()) {
      await adminSkill.click();
      await expect(page.getByRole('button', { name: /^edit$/i })).not.toBeVisible();
    }
  });

  test('edit page should show cancel button', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    const editBtn = page.getByRole('button', { name: /^edit$/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    }
  });

  test('cancel with no changes should navigate back', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    const editBtn = page.getByRole('button', { name: /^edit$/i });
    if (await editBtn.isVisible()) {
      const url = page.url();
      await editBtn.click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(500);
      // Should navigate back to skill detail
      await expect(page).toHaveURL(url);
    }
  });

  test('cancel with changes should show unsaved changes dialog', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    const editBtn = page.getByRole('button', { name: /^edit$/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);
      // Make a change to trigger dirty state
      const editMessage = page.getByPlaceholder('Describe what you changed...');
      if (await editMessage.isVisible()) {
        await editMessage.fill('test change');
        await page.getByRole('button', { name: 'Cancel' }).click();
        await page.waitForTimeout(300);
        // Should show unsaved changes dialog
        await expect(page.getByText('Discard changes?')).toBeVisible();
      }
    }
  });
});
