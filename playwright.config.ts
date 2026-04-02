import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Hearth E2E tests.
 *
 * Run `npx playwright test` to execute all E2E tests.
 * Run `npx playwright test --ui` for the interactive UI mode.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI to handle flakiness; retry once locally too for Supabase rate-limit jitter */
  retries: process.env.CI ? 2 : 1,
  /* Run tests serially to avoid overwhelming the local Supabase instance with concurrent requests */
  workers: 1,
  /* Reporter configuration */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all projects */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    /* Capture trace on first retry for debugging flaky tests */
    trace: 'on-first-retry',
    /* Screenshot only on failure to save disk space */
    screenshot: 'only-on-failure',
    /* Keep video only on failure */
    video: 'retain-on-failure',
  },
  /* Global timeout per test */
  timeout: 30_000,
  /* Assertion timeout */
  expect: {
    timeout: 10_000,
  },
  /* Configure projects for major browsers */
  projects: [
    // Setup project - authenticates and saves session state
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved auth state from setup
        storageState: 'tests/e2e/.auth/parent.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth/parent.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/e2e/.auth/parent.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/.auth/parent.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        storageState: 'tests/e2e/.auth/parent.json',
      },
      dependencies: ['setup'],
    },
  ],
  /* Start dev server before running tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
