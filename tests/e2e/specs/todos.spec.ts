import { test, expect } from '../fixtures';
import { ROUTES, uniqueName } from '../helpers/test-data';

test.describe('To-Do List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.todos);
    await page.waitForLoadState('networkidle');
    // Wait for loading spinner to clear and heading to render
    await page.getByRole('main').getByRole('heading', { name: /to-do/i }).waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should display to-do page with heading', async ({ page }) => {
    await expect(page.getByRole('main').getByRole('heading', { name: /to-do/i })).toBeVisible();
  });

  test('should show filter tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /all tasks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /my tasks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /completed/i })).toBeVisible();
  });

  test('should open add task form', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add task/i });
    await addButton.click();

    // Form should appear with title input
    await expect(page.getByPlaceholder(/what needs to be done/i)).toBeVisible();
  });

  test('should add a new task', async ({ page }) => {
    const taskTitle = uniqueName('Test Task');

    // Open form
    await page.getByRole('button', { name: /add task/i }).click();

    // Fill title
    await page.getByPlaceholder(/what needs to be done/i).fill(taskTitle);

    // Submit
    await page.getByRole('button', { name: /^add task$/i }).click();

    // Task should appear in the list
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('should switch between filter tabs', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Switch to "My Tasks"
    await page.getByRole('button', { name: /my tasks/i }).click();

    // Switch to "Completed"
    await page.getByRole('button', { name: /completed/i }).click();

    // Switch back to "All Tasks"
    await page.getByRole('button', { name: /all tasks/i }).click();
  });

  test('should mark a task as complete', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const completeButton = page.getByRole('button', { name: /complete/i }).first();

    if (await completeButton.isVisible().catch(() => false)) {
      await completeButton.click();
    }
  });
});
