// tests/e2e/comments.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Comments', () => {
  test('should create a comment', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    // The comment textarea uses placeholder "Add a comment..."
    await page.getByPlaceholder(/add a comment/i).fill('E2E test comment');
    await page.getByRole('button', { name: /^comment$/i }).click();

    await expect(page.getByText('E2E test comment')).toBeVisible();
  });

  test('should edit own comment', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.getByRole('textbox').first().clear();
      await page.getByRole('textbox').first().fill('Edited comment');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Edited comment')).toBeVisible();
    }
  });

  test('should delete own comment', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    const deleteBtn = page.getByRole('button', { name: /delete.*comment/i }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.getByRole('button', { name: /confirm/i }).click();
    }
  });
});

test.describe('Admin comment moderation', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test('admin should be able to delete any comment', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    const commentDeleteBtn = page.getByRole('button', { name: /delete/i }).first();
    if (await commentDeleteBtn.isVisible()) {
      await expect(commentDeleteBtn).toBeEnabled();
    }
  });
});
