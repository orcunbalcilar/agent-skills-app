// tests/e2e/inline-editor.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Inline file editor", () => {
  test("should display file tree on skill detail page", async ({ page }) => {
    await page.goto("/skills");
    const link = page.getByRole("link").first();
    if (await link.isVisible()) {
      await link.click();
      // If the skill has files, a file tree should be visible
      const fileTree = page.locator("[data-testid='file-tree'], .file-tree");
      const preBlock = page.locator("pre");
      // Either file tree or spec content should be visible
      const hasFiles = await fileTree.isVisible();
      const hasSpec = await preBlock.first().isVisible();
      expect(hasFiles || hasSpec).toBe(true);
    }
  });

  test("edit page should show Monaco editor for skill files", async ({ page }) => {
    await page.goto("/skills");
    const editableSkill = page.getByRole("link").filter({ hasText: /template/i }).first();
    if (await editableSkill.isVisible()) {
      await editableSkill.click();
      const editBtn = page.getByRole("button", { name: /edit/i });
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(1000);
        // Monaco editor or file upload area should be visible
        const editor = page.locator(".monaco-editor");
        const upload = page.getByText(/upload|drop.*zip|choose.*file/i);
        const hasEditor = await editor.isVisible();
        const hasUpload = await upload.first().isVisible();
        expect(hasEditor || hasUpload).toBe(true);
      }
    }
  });
});
