// tests/e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-password-123";
const USER_EMAIL = process.env.E2E_USER_EMAIL ?? "user@test.local";
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "e2e-user-password-123";

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  storagePath: string
) {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: storagePath });
}

setup("authenticate as admin", async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD, "tests/e2e/.auth/admin.json");
});

setup("authenticate as user", async ({ page }) => {
  await signIn(page, USER_EMAIL, USER_PASSWORD, "tests/e2e/.auth/user.json");
});
