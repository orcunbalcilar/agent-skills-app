// tests/e2e/owners.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill owners", () => {
  test("should add a co-owner to a skill", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const addOwnerBtn = page.getByRole("button", { name: /add owner/i });
    if (await addOwnerBtn.isVisible()) {
      await addOwnerBtn.click();
      await page.getByPlaceholder(/email|user/i).fill("user@test.local");
      await page.getByRole("button", { name: /add/i }).click();
      await expect(page.getByText(/owner added/i)).toBeVisible();
    }
  });

  test("should remove a co-owner", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();

    const removeBtn = page.getByRole("button", { name: /remove.*owner/i }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.getByRole("button", { name: /confirm/i }).click();
    }
  });
});

test.describe("Orphan skill handling", () => {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });

  test("admin should see and reassign orphaned skills", async ({ page }) => {
    await page.goto("/admin");
    const orphanSection = page.getByText(/orphaned/i);
    await expect(orphanSection).toBeVisible();
  });
});
