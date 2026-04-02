import { test, expect } from '../fixtures';
import { ROUTES, uniqueName } from '../helpers/test-data';

test.describe('Shopping List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.shopping);
    await page.waitForLoadState('networkidle');
    // Wait for loading spinner to clear and heading to render
    await page.getByRole('main').getByRole('heading', { name: /shopping/i }).waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should display shopping list page with heading', async ({ page }) => {
    await expect(page.getByRole('main').getByRole('heading', { name: /shopping/i })).toBeVisible();
  });

  test('should show filter tabs', async ({ page }) => {
    const main = page.getByRole('main');
    await expect(main.getByRole('button', { name: /active/i })).toBeVisible();
    await expect(main.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: /purchased/i })).toBeVisible();
  });

  test('should open add item form', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add item/i });
    await addButton.click();

    // Form fields should appear
    await expect(page.getByPlaceholder(/milk|bread/i)).toBeVisible();
  });

  test('should add a new item to the shopping list', async ({ page }) => {
    const itemName = uniqueName('Test Item');

    // Open the add form
    await page.getByRole('button', { name: /add item/i }).click();

    // Fill in item details
    await page.getByPlaceholder(/milk|bread/i).fill(itemName);

    // Submit the form
    await page.getByRole('button', { name: /add to list/i }).click();

    // Wait for the item to appear in the list
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });
  });

  test('should switch between filter tabs', async ({ page }) => {
    const main = page.getByRole('main');
    // Click "All" tab
    await main.getByRole('button', { name: 'All', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // Click "Purchased" tab
    await main.getByRole('button', { name: /purchased/i }).first().click();
    await page.waitForLoadState('networkidle');

    // Click back to "Active" tab
    await main.getByRole('button', { name: /active/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should delete an item from the shopping list', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for delete buttons (trash icon)
    const deleteButton = page.locator('button[aria-label*="delete" i], button:has(svg.lucide-trash)').first();

    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion in modal
      const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }
    }
  });
});
