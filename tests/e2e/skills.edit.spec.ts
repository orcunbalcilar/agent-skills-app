// tests/e2e/skills.edit.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill editing", () => {
  test("owner should be able to edit name and description", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").filter({ hasText: /template/i }).first().click();
    await page.getByRole("link", { name: /edit/i }).click();

    await page.getByLabel("Name").clear();
    await page.getByLabel("Name").fill("updated-skill-name");
    await page.getByLabel("Description").clear();
    await page.getByLabel("Description").fill("Updated description");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("updated-skill-name")).toBeVisible();
  });

  test("non-owner should not see edit button", async ({ page }) => {
    // Navigate to a skill owned by admin (as regular user)
    await page.goto("/skills");
    const adminSkill = page.getByRole("link").filter({ hasText: /admin/i }).first();
    if (await adminSkill.isVisible()) {
      await adminSkill.click();
      await expect(page.getByRole("link", { name: /edit/i })).not.toBeVisible();
    }
  });
});
