// tests/e2e/inline-editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Inline file editor', () => {
  test('should display skill detail content on skill detail page', async ({ page }) => {
    await page.goto('/skills');
    const link = page.locator("main a[href^='/skills/']").first();
    if (await link.isVisible()) {
      await link.click();
      // Skill detail page should show the skill name or spec content
      // The SkillSpecViewer or SkillDetail renders skill info
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible();
    }
  });

  test('edit page should show file upload for skill files', async ({ page }) => {
    await page.goto('/skills');
    const editableSkill = page
      .getByRole('link')
      .filter({ hasText: /template/i })
      .first();
    if (await editableSkill.isVisible()) {
      await editableSkill.click();
      const editBtn = page.getByRole('button', { name: /edit/i });
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(1000);
        // Edit page should show file upload input or file editor
        const fileInput = page.locator("input[type='file']");
        const hasFileInput = await fileInput.isVisible();
        expect(hasFileInput).toBe(true);
      }
    }
  });
});
