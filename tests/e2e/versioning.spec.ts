// tests/e2e/versioning.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill versioning", () => {
  test("should show History tab on skill detail page", async ({ page }) => {
    await page.goto("/skills");
    await page.locator("main a[href^='/skills/']").first().click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("tab", { name: /history/i })).toBeVisible();
  });

  test("should display version history when History tab is clicked", async ({ page }) => {
    await page.goto("/skills");
    const link = page.locator("main a[href^='/skills/']").first();
    if (await link.isVisible()) {
      await link.click();
      const historyTab = page.getByRole("tab", { name: /history/i });
      if (await historyTab.isVisible()) {
        await historyTab.click();
        // Should show either version history entries or "No version history" message
        const content = page.getByText(/version history|no version history/i);
        await expect(content).toBeVisible();
      }
    }
  });

  test("editing a skill should create a new version", async ({ page }) => {
    await page.goto("/skills");
    // Find a template skill to edit
    const editableSkill = page.getByRole("link").filter({ hasText: /template/i }).first();
    if (await editableSkill.isVisible()) {
      await editableSkill.click();
      const editBtn = page.getByRole("button", { name: /edit/i });
      if (await editBtn.isVisible()) {
        await editBtn.click();

        // Fill in edit message if field is available
        const editMsgField = page.getByLabel(/edit message|commit message/i);
        if (await editMsgField.isVisible()) {
          await editMsgField.fill("Test edit for versioning");
        }

        // Update description
        const descField = page.getByLabel("Description");
        if (await descField.isVisible()) {
          await descField.clear();
          await descField.fill("Updated for version test");
        }

        await page.getByRole("button", { name: /save/i }).click();

        // Check version was created in History tab
        const historyTab = page.getByRole("tab", { name: /history/i });
        if (await historyTab.isVisible()) {
          await historyTab.click();
          await page.waitForTimeout(500);
          // There should be at least one version entry
          const versionBadge = page.getByText(/^v\d+$/);
          await expect(versionBadge.first()).toBeVisible();
        }
      }
    }
  });
});
