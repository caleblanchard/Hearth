import { test, expect } from '../fixtures';
import { ROUTES } from '../helpers/test-data';

test.describe('Dashboard Navigation', () => {
  test('should load dashboard home page', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();
  });

  test('should navigate to chores page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('Chores');

    await expect(page).toHaveURL(ROUTES.chores);
    await expect(page.getByRole('main').getByRole('heading', { name: /chores/i })).toBeVisible();
  });

  test('should navigate to shopping page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('Shopping');

    await expect(page).toHaveURL(ROUTES.shopping);
    await expect(page.getByRole('main').getByRole('heading', { name: /shopping/i })).toBeVisible();
  });

  test('should navigate to meals page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('Meals');

    await expect(page).toHaveURL(ROUTES.meals);
    await expect(page.getByRole('main').getByRole('heading', { name: /meal/i })).toBeVisible();
  });

  test('should navigate to communication page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('Communication');

    await expect(page).toHaveURL(ROUTES.communication);
    await expect(page.getByRole('main').getByRole('heading', { name: /communication/i })).toBeVisible();
  });

  test('should navigate to to-do page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('To-Do');

    await expect(page).toHaveURL(ROUTES.todos);
    await expect(page.getByRole('main').getByRole('heading', { name: /to-do/i })).toBeVisible();
  });

  test('should navigate to calendar page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('Calendar');

    await expect(page).toHaveURL(ROUTES.calendar);
  });

  test('should navigate to family page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('Family');

    await expect(page).toHaveURL(ROUTES.family);
  });

  test('should navigate to profile page', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateTo('Profile');

    await expect(page).toHaveURL(ROUTES.profile);
  });
});
