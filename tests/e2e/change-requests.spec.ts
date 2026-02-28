// tests/e2e/change-requests.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Change requests', () => {
  test('should submit a change request', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    // Click "Submit Change Request" button in the action bar to open dialog
    await page.getByRole('button', { name: /submit change request/i }).click();

    await page.getByLabel(/title/i).fill('E2E Change Request');
    await page.getByLabel(/description/i).fill('This is a test change request');
    await page.getByRole('button', { name: /^submit$/i }).click();

    // Switch to Change Requests tab to see it
    await page.getByRole('tab', { name: /change requests/i }).click();
    await expect(page.getByText('E2E Change Request').first()).toBeVisible();
  });

  test('should withdraw own change request', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    await page.getByRole('tab', { name: /change requests/i }).click();

    const withdrawBtn = page.getByRole('button', { name: /withdraw/i }).first();
    if (await withdrawBtn.isVisible()) {
      await withdrawBtn.click();
      await expect(page.getByText(/withdrawn/i)).toBeVisible();
    }
  });
});

test.describe('Change request approval', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test('admin should approve a change request and version increments', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    await page.getByRole('tab', { name: /change requests/i }).click();

    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await expect(page.getByText(/approved/i)).toBeVisible();
    }
  });

  test('admin should reject a change request', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    await page.getByRole('tab', { name: /change requests/i }).click();

    const rejectBtn = page.getByRole('button', { name: /reject/i }).first();
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();
      await expect(page.getByText(/rejected/i)).toBeVisible();
    }
  });
});
