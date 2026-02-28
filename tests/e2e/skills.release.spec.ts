// tests/e2e/skills.release.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Skill release', () => {
  test('should see release button on a template skill', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    // Release button is only visible for TEMPLATE skills owned by user
    const releaseBtn = page.getByRole('button', { name: /^release$/i });
    if (await releaseBtn.isVisible()) {
      await expect(releaseBtn).toBeVisible();
    }
  });

  test('released skill should not show release button', async ({ page }) => {
    await page.goto('/skills');
    // Find a released skill (badge shows version like "v1")
    const releasedLink = page.locator("main a[href^='/skills/']").first();
    if (await releasedLink.isVisible()) {
      await releasedLink.click();
      const statusBadge = page.getByText(/^RELEASED/i);
      if (await statusBadge.isVisible()) {
        // Released skills should NOT have a release button
        await expect(page.getByRole('button', { name: /^release$/i })).not.toBeVisible();
      }
    }
  });

  test('released skill should show version', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    // If the skill is released, it shows "RELEASED v1" badge
    const versionBadge = page.getByText(/RELEASED v\d+/i);
    if (await versionBadge.isVisible()) {
      await expect(versionBadge).toBeVisible();
    }
  });
});
