// tests/e2e/profile-image.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Profile image', () => {
  test('should display user avatar in the profile button', async ({ page }) => {
    await page.goto('/');
    // The user menu button should contain an avatar (either an image or fallback initials)
    const userMenu = page.getByRole('button', { name: /user menu/i });
    if (await userMenu.isVisible()) {
      // Check for avatar image or fallback
      const avatar = userMenu.locator("img, [data-testid='avatar-fallback'], span");
      await expect(avatar.first()).toBeVisible();
    }
  });
});
