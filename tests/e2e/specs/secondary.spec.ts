import { test, expect } from '../fixtures';
import { ROUTES } from '../helpers/test-data';

test.describe('Calendar', () => {
  test('should display calendar page', async ({ page }) => {
    await page.goto(ROUTES.calendar);
    await page.waitForLoadState('networkidle');

    // Calendar should render
    await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Family Management', () => {
  test('should display family page', async ({ page }) => {
    await page.goto(ROUTES.family);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main').getByRole('heading', { name: /family/i }).first()).toBeVisible();
  });

  test('should show family members', async ({ page }) => {
    await page.goto(ROUTES.family);
    await page.waitForLoadState('networkidle');

    // Should show at least the test parent user
    await expect(page.getByRole('main').getByText(/sarah/i).first()).toBeVisible();
  });
});

test.describe('Medications', () => {
  test('should display medications page', async ({ page }) => {
    await page.goto(ROUTES.medications);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main').getByRole('heading', { name: /medication/i })).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('should display profile page', async ({ page }) => {
    await page.goto(ROUTES.profile);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main').getByRole('heading', { name: /profile/i })).toBeVisible();
  });
});
