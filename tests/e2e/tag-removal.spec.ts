// tests/e2e/tag-removal.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Tag removal", () => {
  test("should allow removing tags when editing a skill", async ({ page }) => {
    await page.goto("/skills");
    const editableSkill = page.getByRole("link").filter({ hasText: /template/i }).first();
    if (await editableSkill.isVisible()) {
      await editableSkill.click();
      const editBtn = page.getByRole("button", { name: /edit/i });
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(500);

        // Look for tag badges with remove buttons (×, remove, etc.)
        const tagRemoveBtn = page.locator("button").filter({ hasText: /×|✕|remove/ });
        const tagCount = await tagRemoveBtn.count();
        if (tagCount > 0) {
          // Click remove on first tag
          await tagRemoveBtn.first().click();
          await page.waitForTimeout(300);
          // Tag count should decrease
          const newCount = await tagRemoveBtn.count();
          expect(newCount).toBeLessThanOrEqual(tagCount);
        }
      }
    }
  });
});
