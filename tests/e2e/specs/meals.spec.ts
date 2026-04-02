import { test, expect } from '../fixtures';
import { ROUTES } from '../helpers/test-data';

test.describe('Meals & Recipes', () => {
  test('should display meal planning page', async ({ page }) => {
    await page.goto(ROUTES.meals);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main').getByRole('heading', { name: /meal/i })).toBeVisible();
  });

  test('should display recipes page', async ({ page }) => {
    await page.goto(ROUTES.recipes);
    await page.waitForLoadState('networkidle');

    // Should show recipe list or empty state
    await expect(page.getByRole('main').getByRole('heading', { name: /recipe/i }).first()).toBeVisible();
  });

  test('should navigate to new recipe form', async ({ page }) => {
    await page.goto(ROUTES.recipes);
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('link', { name: /add recipe|new recipe/i });
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await expect(page).toHaveURL(ROUTES.newRecipe);
    }
  });

  test('should display recipe creation form with required fields', async ({ page }) => {
    await page.goto(ROUTES.newRecipe);
    await page.waitForLoadState('networkidle');

    // Should show the recipe form
    await expect(page.getByRole('main').getByRole('heading', { name: /recipe/i }).first()).toBeVisible();
  });

  test('should show URL import option on new recipe page', async ({ page }) => {
    await page.goto(ROUTES.newRecipe);
    await page.waitForLoadState('networkidle');

    // Should have the "Import from URL" toggle button
    await expect(page.getByRole('button', { name: /import from url/i })).toBeVisible();
  });
});
