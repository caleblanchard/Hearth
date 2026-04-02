import { test, expect } from '../fixtures';
import { TEST_PARENT, ROUTES } from '../helpers/test-data';

test.describe('Authentication Flows', () => {
  // Auth tests need a clean browser context (no stored session)
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show sign-in page with form fields', async ({ signInPage }) => {
    await signInPage.goto();
    await signInPage.expectVisible();
  });

  test('should sign in with valid credentials and redirect to dashboard', async ({ signInPage, page }) => {
    await signInPage.goto();
    await signInPage.signIn(TEST_PARENT.email, TEST_PARENT.password);

    await page.waitForURL(ROUTES.dashboard, { timeout: 15_000 });
    await expect(page).toHaveURL(ROUTES.dashboard);
  });

  test('should show error for invalid credentials', async ({ signInPage }) => {
    await signInPage.goto();
    await signInPage.signIn('invalid@example.com', 'wrongpassword');

    await signInPage.expectError();
  });

  test('should redirect unauthenticated users from dashboard to sign-in', async ({ page }) => {
    await page.goto(ROUTES.dashboard);

    // Should be redirected to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe('Authenticated Redirects', () => {
  // These tests use the default authenticated storageState
  test('should redirect authenticated users from sign-in to dashboard', async ({ page }) => {
    await page.goto(ROUTES.signIn);

    // Authenticated users should be redirected away from sign-in
    await expect(page).not.toHaveURL(ROUTES.signIn);
  });
});
