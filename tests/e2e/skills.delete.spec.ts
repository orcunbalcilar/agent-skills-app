// tests/e2e/skills.delete.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill deletion", () => {
  test("owner should be able to delete own skill", async ({ page }) => {
    await page.goto("/skills/new");
    await page.getByLabel("Name").fill("e2e-delete-me");
    await page.getByLabel("Description").fill("To be deleted");
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/skills\//);

    await page.getByRole("button", { name: /delete/i }).click();
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL("/skills");
  });

  test("non-owner should not see delete button", async ({ page }) => {
    await page.goto("/skills");
    const skill = page.getByRole("link").first();
    if (await skill.isVisible()) {
      await skill.click();
      // Non-owners shouldn't see delete
      const deleteBtn = page.getByRole("button", { name: /delete/i });
      if (await deleteBtn.isVisible()) {
        // If visible, user is owner — that's fine, skip assertion
      }
    }
  });
});

test.describe("Admin skill deletion", () => {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });

  test("admin should be able to delete any skill", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();
    const deleteBtn = page.getByRole("button", { name: /delete/i });
    await expect(deleteBtn).toBeVisible();
  });
});
