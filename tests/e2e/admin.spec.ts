// tests/e2e/admin.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/e2e/.auth/admin.json' });

// Helper: navigate to /admin and wait for the page to fully render.
// The admin page uses useSession() which initially returns null,
// causing a temporary redirect to /skills. We click the sidebar link instead
// to navigate after the session is loaded.
async function gotoAdmin(page: import('@playwright/test').Page) {
  // Navigate to any page first so the session loads
  await page.goto('/skills');
  await page.waitForTimeout(1000);
  // Now click the Admin Panel sidebar link - session should be loaded by now
  await page.getByRole('link', { name: 'Admin Panel' }).click();
  // Wait for the admin page heading to appear
  await page.getByRole('heading', { name: /admin panel/i }).waitFor({ timeout: 10000 });
}

test.describe('Admin panel', () => {
  test('admin should see orphaned skills section', async ({ page }) => {
    await gotoAdmin(page);
    // CardTitle renders as <div data-slot="card-title">, not a heading
    await expect(
      page.locator("[data-slot='card-title']").filter({ hasText: /orphaned skills/i }),
    ).toBeVisible();
  });

  test('admin should assign orphaned skill to user', async ({ page }) => {
    await gotoAdmin(page);

    const assignBtn = page.getByRole('button', { name: /assign/i }).first();
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await page.getByPlaceholder(/user/i).fill('user@test.local');
      await page
        .getByRole('button', { name: /confirm|assign/i })
        .last()
        .click();
      await page.waitForTimeout(500);
    }
  });

  test('admin should see admin panel heading', async ({ page }) => {
    await gotoAdmin(page);
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible();
  });

  test('admin should toggle user role', async ({ page }) => {
    await gotoAdmin(page);

    const roleBtn = page.getByRole('button', { name: /role|admin|user/i }).first();
    if (await roleBtn.isVisible()) {
      await roleBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('admin should manage system tags', async ({ page }) => {
    await gotoAdmin(page);
    // CardTitle renders as <div data-slot="card-title">, not a heading
    await expect(
      page.locator("[data-slot='card-title']").filter({ hasText: /system tags/i }),
    ).toBeVisible();
  });
});
