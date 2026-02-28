// tests/e2e/skills.create.spec.ts
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

async function createSkillZip(name: string, description: string): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder(name)!;
  folder.file('SKILL.md', `---\nname: ${name}\ndescription: ${description}\n---\n`);
  return Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }));
}

test.describe('Skill creation', () => {
  test('should create a new template skill', async ({ page }) => {
    await page.goto('/skills/new');

    const buffer = await createSkillZip('e2e-test-skill', 'A skill created via E2E tests');
    await page.locator("input[type='file']").setInputFiles({
      name: 'e2e-test-skill.zip',
      mimeType: 'application/zip',
      buffer,
    });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /save as template/i }).click();
    await expect(page).toHaveURL(/\/skills\//);
  });

  test('should upload a valid skill zip file', async ({ page }) => {
    await page.goto('/skills/new');

    const buffer = await createSkillZip('e2e-upload-skill', 'Uploaded spec');
    await page.locator("input[type='file']").setInputFiles({
      name: 'e2e-upload-skill.zip',
      mimeType: 'application/zip',
      buffer,
    });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /save as template/i }).click();
    await expect(page).toHaveURL(/\/skills\//);
  });

  test('should reject file over 10MB', async ({ page }) => {
    await page.goto('/skills/new');

    // Create a buffer larger than 10MB
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'a');
    await page.locator("input[type='file']").setInputFiles({
      name: 'large.zip',
      mimeType: 'application/zip',
      buffer: largeBuffer,
    });
    await page.waitForTimeout(1000);

    // Should show an error about file size in the form alert (not the route announcer)
    const alert = page.locator("[data-slot='alert']");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/10 MB|limit|too large|exceed/i);
  });
});
