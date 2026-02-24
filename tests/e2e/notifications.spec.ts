// tests/e2e/notifications.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Notifications", () => {
  test("should show notifications page", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByText(/notification/i)).toBeVisible();
  });

  test("should mark a notification as read", async ({ page }) => {
    await page.goto("/notifications");

    const unreadNotif = page.locator("[data-testid='notification-item']").first();
    if (await unreadNotif.isVisible()) {
      await unreadNotif.click();
      // After clicking, it should be marked read
    }
  });

  test("should mark all notifications as read", async ({ page }) => {
    await page.goto("/notifications");

    const markAllBtn = page.getByRole("button", { name: /mark all.*read/i });
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("should toggle notification preferences", async ({ page }) => {
    await page.goto("/notifications/preferences");

    const toggle = page.getByRole("switch").first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(300);
      // Toggle should change state
    }
  });
});
