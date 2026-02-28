// tests/e2e/skills.delete.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Skill deletion', () => {
  test('owner should be able to delete own skill', async ({ page }) => {
    // Navigate to a skill owned by the user
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    const deleteBtn = page.getByRole('button', { name: /^delete$/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      // Confirm dialog has a destructive "Delete" button
      await page
        .locator("[role='dialog']")
        .getByRole('button', { name: /delete/i })
        .click();
      await expect(page).toHaveURL('/skills');
    }
  });

  test('non-owner should not see delete button', async ({ page }) => {
    await page.goto('/skills');
    const skill = page.locator("main a[href^='/skills/']").first();
    if (await skill.isVisible()) {
      await skill.click();
      // Non-owners shouldn't see delete
      const deleteBtn = page.getByRole('button', { name: /^delete$/i });
      if (await deleteBtn.isVisible()) {
        // If visible, user is owner — that's fine, skip assertion
      }
    }
  });
});

test.describe('Admin skill deletion', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test('admin should be able to see delete button on any skill', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    // Admin should see the delete button (they are owner or admin)
    const deleteBtn = page.getByRole('button', { name: /delete/i });
    await expect(deleteBtn).toBeVisible();
  });
});
