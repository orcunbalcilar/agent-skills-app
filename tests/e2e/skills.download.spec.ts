// tests/e2e/skills.download.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill download", () => {
  test("should have a download button on skill detail page", async ({ page }) => {
    await page.goto("/skills");
    await page.locator("main a[href^='/skills/']").first().click();

    // The download button opens a new window with /api/v1/download/:id
    const downloadBtn = page.getByRole("button", { name: /download/i });
    await expect(downloadBtn).toBeVisible();
  });

  test("download API should return a zip file", async ({ request }) => {
    // Get a skill ID first
    const skillsRes = await request.get("/api/v1/skills");
    const skills = await skillsRes.json();
    if (skills.data?.length > 0) {
      const skillId = skills.data[0].id;
      const downloadRes = await request.get(`/api/v1/download/${skillId}`);
      expect(downloadRes.status()).toBe(200);
      expect(downloadRes.headers()["content-type"]).toContain("application/zip");
    }
  });
});
