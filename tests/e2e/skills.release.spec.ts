// tests/e2e/skills.release.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill release", () => {
  test("should release a template skill", async ({ page }) => {
    await page.goto("/skills");
    // Navigate to a template owned by the user
    await page.getByRole("link", { name: /template/i }).first().click();
    await page.getByRole("button", { name: /release/i }).click();
    await page.getByRole("button", { name: /confirm/i }).click();

    await expect(page.getByText(/released/i)).toBeVisible();
  });

  test("release should be irreversible", async ({ page }) => {
    await page.goto("/skills");
    // Find a released skill
    await page.getByText(/released/i).first().click();
    await expect(page.getByRole("button", { name: /release/i })).not.toBeVisible();
  });

  test("released skill should show version v1", async ({ page }) => {
    await page.goto("/skills");
    await page.getByText(/released/i).first().click();
    await expect(page.getByText(/v1/i)).toBeVisible();
  });
});
