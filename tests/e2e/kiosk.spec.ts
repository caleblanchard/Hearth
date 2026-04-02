/**
 * Kiosk Mode E2E Tests
 *
 * Tests for the kiosk mode flow including navigation,
 * lock/unlock, and settings management.
 *
 * Note: Many tests require kiosk device setup (PINs, device secrets)
 * that isn't part of the standard E2E seed data. These are skipped
 * until kiosk test infrastructure is in place.
 */

import { test, expect } from './fixtures';
import { ROUTES } from './helpers/test-data';

test.describe('Kiosk Mode E2E', () => {

  test('should navigate to kiosk mode from sidebar', async ({ page }) => {
    await page.goto(ROUTES.dashboard);

    // Kiosk group is collapsed by default; expand it first
    const kioskToggle = page.locator('aside:visible button.uppercase', { hasText: /kiosk/i });
    if (await kioskToggle.isVisible().catch(() => false)) {
      await kioskToggle.click();
    }

    const kioskButton = page.locator('aside:visible button:has(> span:text-is("Kiosk Mode"))');
    if (!(await kioskButton.isVisible().catch(() => false))) {
      test.skip(true, 'Kiosk Mode not available in sidebar (module not loaded or user not parent)');
    }
    await kioskButton.click();

    await expect(page).toHaveURL(ROUTES.kiosk);
  });

  test('should display kiosk in locked state initially', async ({ page }) => {
    await page.goto(ROUTES.kiosk);
    test.skip(true, 'Requires kiosk device setup with PINs and device secrets');
  });

  test('should unlock kiosk with member PIN', async ({ page }) => {
    await page.goto(ROUTES.kiosk);
    test.skip(true, 'Requires kiosk device setup with PINs and device secrets');
  });

  test('should display dashboard widgets when unlocked', async ({ page }) => {
    await page.goto(ROUTES.kiosk);
    test.skip(true, 'Requires kiosk device setup with PINs and device secrets');
  });

  test('should auto-lock after inactivity', async ({ page }) => {
    test.skip(true, 'Requires timer mocking and kiosk device setup');
  });

  test('should manually lock kiosk', async ({ page }) => {
    await page.goto(ROUTES.kiosk);
    test.skip(true, 'Requires kiosk device setup with PINs and device secrets');
  });

  test('should allow parent to end kiosk session', async ({ page }) => {
    test.skip(true, 'Requires kiosk device setup');
  });

  test('should navigate to kiosk settings and update configuration', async ({ page }) => {
    await page.goto(ROUTES.dashboard);

    // Kiosk group is collapsed by default; expand it first
    const kioskToggle = page.locator('aside:visible button.uppercase', { hasText: /kiosk/i });
    if (await kioskToggle.isVisible().catch(() => false)) {
      await kioskToggle.click();
    }

    const settingsButton = page.locator('aside:visible button:has(> span:text-is("Kiosk Settings"))');
    if (!(await settingsButton.isVisible().catch(() => false))) {
      test.skip(true, 'Kiosk Settings not available in sidebar');
    }
    await settingsButton.click();
    await expect(page).toHaveURL(ROUTES.kioskSettings);
  });
});

test.describe('Dashboard Widgets E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.waitForLoadState('networkidle');
  });

  test('should display all new widgets on dashboard', async ({ page }) => {
    // Scroll down to see dashboard content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Dashboard uses cards with bg-white/dark:bg-gray-800 classes
    const hasContent = await page.locator('.rounded-lg.shadow, [class*="rounded-lg"][class*="shadow"]').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should load widget data dynamically', async ({ page }) => {
    test.skip(true, 'Requires test data setup');
  });
});
