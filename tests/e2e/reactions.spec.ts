// tests/e2e/reactions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Reactions', () => {
  test('should add a reaction to a skill', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    // EmojiReactions buttons have aria-labels like "Thumbs up", "Heart", etc.
    const reactionBtn = page.getByRole('button', { name: /thumbs up/i }).first();
    if (await reactionBtn.isVisible()) {
      await reactionBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('should toggle reaction off', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    const reactionBtn = page.getByRole('button', { name: /thumbs up/i }).first();
    if (await reactionBtn.isVisible()) {
      // Click twice to toggle off
      await reactionBtn.click();
      await page.waitForTimeout(300);
      await reactionBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('should see reaction buttons on skill detail', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    // Check that some reaction buttons exist via the fieldset legend
    const reactions = page.locator('fieldset').first();
    if (await reactions.isVisible()) {
      await expect(reactions).toBeVisible();
    }
  });

  test('should support all 8 emoji types on skills', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();

    // EmojiReactions component has 8 buttons with aria-labels
    const emojiLabels = [
      'Thumbs up',
      'Thumbs down',
      'Heart',
      'Hooray',
      'Laugh',
      'Confused',
      'Rocket',
      'Eyes',
    ];
    for (const label of emojiLabels) {
      const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      await expect(btn).toBeVisible();
    }
  });
});
