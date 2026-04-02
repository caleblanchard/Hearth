import { test, expect } from '../fixtures';
import { ROUTES, uniqueName } from '../helpers/test-data';

test.describe('Communication Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.communication);
    await page.waitForLoadState('networkidle');
    // Wait for the page heading to render
    await page.getByRole('main').getByRole('heading', { name: /communication/i }).waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should display communication board with heading', async ({ page }) => {
    await expect(page.getByRole('main').getByRole('heading', { name: /communication/i })).toBeVisible();
  });

  test('should show new message button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new message/i })).toBeVisible();
  });

  test('should open post composer modal', async ({ page }) => {
    await page.getByRole('button', { name: /new message/i }).click();

    // Modal should open with "Create New Post" heading
    await expect(page.getByText(/create new post/i)).toBeVisible();
  });

  test('should display communication feed', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show posts or an empty state
    const hasPosts = await page.locator('[data-testid="post-item"], .rounded-lg.shadow').count() > 0;
    const hasEmptyState = await page.getByText(/no posts yet/i).isVisible().catch(() => false);

    expect(hasPosts || hasEmptyState).toBeTruthy();
  });
});
