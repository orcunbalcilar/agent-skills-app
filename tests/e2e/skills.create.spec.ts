// tests/e2e/skills.create.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Skill creation", () => {
  test("should create a new template skill", async ({ page }) => {
    await page.goto("/skills/new");
    await page.getByLabel("Name").fill("e2e-test-skill");
    await page.getByLabel("Description").fill("A skill created via E2E tests");
    await page.getByRole("button", { name: /create/i }).click();

    await expect(page).toHaveURL(/\/skills\//);
    await expect(page.getByText("e2e-test-skill")).toBeVisible();
  });

  test("should upload a JSON spec file", async ({ page }) => {
    await page.goto("/skills/new");
    await page.getByLabel("Name").fill("e2e-upload-skill");
    await page.getByLabel("Description").fill("Uploaded spec");

    const spec = JSON.stringify({ name: "e2e-upload-skill", description: "test" });
    const buffer = Buffer.from(spec);
    await page.getByLabel(/spec/i).setInputFiles({
      name: "skill.json",
      mimeType: "application/json",
      buffer,
    });

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/skills\//);
  });

  test("should reject spec over 512KB", async ({ page }) => {
    await page.goto("/skills/new");
    await page.getByLabel("Name").fill("e2e-large-skill");
    await page.getByLabel("Description").fill("Too large");

    const largeSpec = JSON.stringify({ name: "x", body: "a".repeat(520_000) });
    const buffer = Buffer.from(largeSpec);
    await page.getByLabel(/spec/i).setInputFiles({
      name: "large.json",
      mimeType: "application/json",
      buffer,
    });

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText(/512/i)).toBeVisible();
  });
});
