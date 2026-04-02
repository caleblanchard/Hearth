import { test as setup, expect } from '@playwright/test';
import path from 'path';

const parentAuthFile = path.join(__dirname, '.auth', 'parent.json');

/**
 * Global setup: authenticate as parent user and save session state.
 * This runs once before all tests and stores cookies so individual
 * tests don't need to log in repeatedly.
 */
setup('authenticate as parent', async ({ page }) => {
  await page.goto('/auth/signin');

  await page.locator('#email').fill('sarah@example.com');
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to dashboard after successful login
  await page.waitForURL('/dashboard', { timeout: 15_000 });

  // Verify we're actually logged in
  await expect(page).toHaveURL('/dashboard');

  // Save signed-in state
  await page.context().storageState({ path: parentAuthFile });
});
