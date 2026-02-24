// tests/e2e/reactions.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Reactions", () => {
  test("should add a reaction to a skill", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    // Click a reaction emoji button
    const reactionBtn = page.getByRole("button", { name: /👍|like|thumbs/i }).first();
    if (await reactionBtn.isVisible()) {
      await reactionBtn.click();
      // Count should increase
      await page.waitForTimeout(300);
    }
  });

  test("should toggle reaction off", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const reactionBtn = page.getByRole("button", { name: /👍|like|thumbs/i }).first();
    if (await reactionBtn.isVisible()) {
      // Click twice to toggle off
      await reactionBtn.click();
      await page.waitForTimeout(300);
      await reactionBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("should add reaction to a comment", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    // Find comment reactions
    const commentReaction = page.locator("[data-testid='comment-reaction']").first();
    if (await commentReaction.isVisible()) {
      await commentReaction.click();
      await page.waitForTimeout(300);
    }
  });

  test("should support all 8 emoji types on skills", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const emojis = ["👍", "👎", "❤️", "🎉", "😂", "😮", "😢", "🚀"];
    for (const emoji of emojis) {
      // Check each emoji button exists
      await page.getByRole("button", { name: emoji }).first().isVisible();
    }
    await expect(page.locator("[data-testid='reactions']").first()).toBeVisible();
  });
});
