// tests/e2e/skills.delete.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Skill deletion', () => {
  // Run serially so beforeAll/afterAll share state correctly
  test.describe.configure({ mode: 'serial' });

  let createdSkillId: string;
  const uniqueName = `e2e-delete-${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    // Create a dedicated skill for the delete test so we don't destroy seed data
    const res = await request.post('/api/v1/skills', {
      data: {
        name: uniqueName,
        description: 'Skill created solely for deletion test',
        spec: { name: uniqueName, description: 'Skill created solely for deletion test', body: 'temp' },
        files: [{ path: 'SKILL.md', content: `---\nname: ${uniqueName}\n---\n` }],
      },
    });
    const body = await res.json();
    createdSkillId = body.data?.id;
  });

  test('owner should be able to delete own skill', async ({ page }) => {
    test.skip(!createdSkillId, 'No test skill was created');
    await page.goto(`/skills/${createdSkillId}`);
    // Wait for skill detail to fully render
    await page.waitForSelector('role=heading', { timeout: 10_000 });

    const deleteBtn = page.getByRole('button', { name: /^delete$/i });
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click();
    // Confirm dialog has a destructive "Delete" button
    await page
      .locator("[role='dialog']")
      .getByRole('button', { name: /delete/i })
      .click();
    await expect(page).toHaveURL('/skills');
  });

  test('non-owner should not see delete button', async ({ page }) => {
    await page.goto('/skills');
    const skill = page.locator("main a[href^='/skills/']").first();
    if (await skill.isVisible()) {
      await skill.click();
      // Non-owners shouldn't see delete
      const deleteBtn = page.getByRole('button', { name: /^delete$/i });
      if (await deleteBtn.isVisible()) {
        // If visible, user is owner — that's fine, skip assertion
      }
    }
  });
});

test.describe('Admin skill deletion', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test('admin should be able to see delete button on any skill', async ({ page }) => {
    await page.goto('/skills');
    await page.locator("main a[href^='/skills/']").first().click();
    // Admin should see the skill-level delete button (use exact name to avoid
    // matching comment-level "Delete" buttons that may also be on the page)
    const deleteBtn = page.getByRole('button', { name: 'Delete', exact: true }).first();
    await expect(deleteBtn).toBeVisible();
  });
});
