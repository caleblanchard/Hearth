import { test as base, expect } from '@playwright/test';
import { SignInPage } from './pages/sign-in.page';
import { DashboardPage } from './pages/dashboard.page';

/**
 * Extended test fixtures for Hearth E2E tests.
 * Provides pre-configured page objects for common pages.
 */
export const test = base.extend<{
  signInPage: SignInPage;
  dashboardPage: DashboardPage;
}>({
  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect };
