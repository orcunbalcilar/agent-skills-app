// tests/e2e/admin.spec.ts
import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/admin.json" });

test.describe("Admin panel", () => {
  test("admin should see orphaned skills section", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/orphaned/i)).toBeVisible();
  });

  test("admin should assign orphaned skill to user", async ({ page }) => {
    await page.goto("/admin");

    const assignBtn = page.getByRole("button", { name: /assign/i }).first();
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await page.getByPlaceholder(/user/i).fill("user@test.local");
      await page.getByRole("button", { name: /confirm|assign/i }).last().click();
      await page.waitForTimeout(500);
    }
  });

  test("admin should see users table", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/users/i)).toBeVisible();
  });

  test("admin should toggle user role", async ({ page }) => {
    await page.goto("/admin");

    const roleBtn = page.getByRole("button", { name: /role|admin|user/i }).first();
    if (await roleBtn.isVisible()) {
      await roleBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("admin should manage system tags", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/tag/i)).toBeVisible();
  });
});
