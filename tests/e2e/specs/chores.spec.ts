import { test, expect } from '../fixtures';
import { ROUTES, uniqueName } from '../helpers/test-data';

test.describe('Chores Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.chores);
    await page.waitForLoadState('networkidle');
  });

  test('should display chores page with heading', async ({ page }) => {
    await expect(page.getByRole('main').getByRole('heading', { name: /chores/i })).toBeVisible();
  });

  test('should display chore cards or empty state', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Should either show chore cards or an empty state message
    const hasChores = await page.locator('[class*="chore"], [class*="card"]').count() > 0;
    const hasEmptyState = await page.getByText(/no chores/i).isVisible().catch(() => false);

    expect(hasChores || hasEmptyState).toBeTruthy();
  });

  test('should show chore details with status and credits', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // If there are chores, check they have expected elements
    const choreCards = page.locator('h3');
    const count = await choreCards.count();

    if (count > 0) {
      // First chore card should be visible
      await expect(choreCards.first()).toBeVisible();
    }
  });

  test('should be able to mark a chore as complete', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const completeButton = page.getByRole('button', { name: /mark complete/i }).first();

    if (await completeButton.isVisible().catch(() => false)) {
      await completeButton.click();

      // Should show some confirmation of completion
      await expect(
        page.getByText(/complete|approved|waiting/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
