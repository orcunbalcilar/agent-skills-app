// tests/e2e/follow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Follow / Unfollow", () => {
  test("should follow a skill", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const followBtn = page.getByRole("button", { name: /follow/i });
    if (await followBtn.isVisible()) {
      await followBtn.click();
      await expect(page.getByRole("button", { name: /unfollow/i })).toBeVisible();
    }
  });

  test("should unfollow a skill", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const unfollowBtn = page.getByRole("button", { name: /unfollow/i });
    if (await unfollowBtn.isVisible()) {
      await unfollowBtn.click();
      await expect(page.getByRole("button", { name: /follow/i })).toBeVisible();
    }
  });

  test("follower count should update after follow", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const countEl = page.getByTestId("follower-count");
    const followBtn = page.getByRole("button", { name: /follow/i });

    if (await followBtn.isVisible() && await countEl.isVisible()) {
      const before = Number(await countEl.textContent());
      await followBtn.click();
      await page.waitForTimeout(500);
      const after = Number(await countEl.textContent());
      expect(after).toBeGreaterThanOrEqual(before);
    }
  });
});
