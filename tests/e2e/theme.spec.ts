// tests/e2e/theme.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test("should toggle between dark and light mode", async ({ page }) => {
    await page.goto("/");

    // Find the theme toggle button
    const themeBtn = page.getByRole("button", { name: /theme|dark|light|moon|sun/i });
    if (await themeBtn.isVisible()) {
      // Check initial state
      const html = page.locator("html");
      const initialClass = await html.getAttribute("class");
      const wasDark = initialClass?.includes("dark");

      await themeBtn.click();
      await page.waitForTimeout(300);

      const newClass = await html.getAttribute("class");
      const isDark = newClass?.includes("dark");

      // Should have toggled
      expect(isDark).not.toBe(wasDark);
    }
  });

  test("theme should persist after reload", async ({ page }) => {
    await page.goto("/");

    const themeBtn = page.getByRole("button", { name: /theme|dark|light|moon|sun/i });
    if (await themeBtn.isVisible()) {
      // Toggle to dark
      await themeBtn.click();
      await page.waitForTimeout(300);

      const classBeforeReload = await page.locator("html").getAttribute("class");
      await page.reload();
      await page.waitForTimeout(500);

      const classAfterReload = await page.locator("html").getAttribute("class");
      expect(classAfterReload).toBe(classBeforeReload);
    }
  });
});
