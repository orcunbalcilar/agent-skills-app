// tests/e2e/skills.fork.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill forking", () => {
  test("should fork a released skill", async ({ page }) => {
    await page.goto("/skills");
    // Click on a released skill
    await page.getByRole("link").first().click();
    await page.getByRole("button", { name: /fork/i }).click();

    await expect(page).toHaveURL(/\/skills\//);
    await expect(page.getByText(/fork/i)).toBeVisible();
  });

  test("forked skill should be a TEMPLATE", async ({ page }) => {
    await page.goto("/skills");
    // Look for a forked skill with template status
    await page.getByText(/template/i).first().click();
    await expect(page.getByText(/template/i)).toBeVisible();
  });

  test("fork should show forkedFrom badge", async ({ page }) => {
    await page.goto("/skills");
    await page.getByRole("link").first().click();
    await page.getByRole("button", { name: /fork/i }).click();

    await expect(page.getByText(/forked from/i)).toBeVisible();
  });
});
