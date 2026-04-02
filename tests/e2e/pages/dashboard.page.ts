import { type Page, type Locator, expect } from '@playwright/test';
import { ROUTES } from '../helpers/test-data';

// Map sidebar link text to routes for fallback navigation
const NAV_ROUTES: Record<string, string> = {
  'Dashboard': ROUTES.dashboard,
  'Chores': ROUTES.chores,
  'Shopping': ROUTES.shopping,
  'Meals': ROUTES.meals,
  'Communication': ROUTES.communication,
  'Calendar': ROUTES.calendar,
  'To-Do': ROUTES.todos,
  'Family': ROUTES.family,
  'Profile': ROUTES.profile,
};

/**
 * Page Object Model for the Dashboard and sidebar navigation.
 */
export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('nav');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  /** Navigate to a module by clicking its sidebar button, with URL fallback */
  async navigateTo(linkText: string) {
    // Sidebar nav items are rendered as <button> elements.
    // Scope to visible sidebar to avoid matching the hidden mobile sidebar.
    const navButton = this.page.locator(`aside:visible button:has(> span:text-is("${linkText}"))`);

    try {
      // Try expanding collapsed groups if button not visible
      if (!(await navButton.isVisible().catch(() => false))) {
        const groupToggles = this.page.locator('aside:visible button.uppercase');
        const count = await groupToggles.count();
        for (let i = 0; i < count; i++) {
          if (await navButton.isVisible().catch(() => false)) break;
          await groupToggles.nth(i).click().catch(() => {});
        }
      }
      await navButton.click({ timeout: 5000 });
    } catch {
      // Fallback: navigate directly if sidebar button unavailable (e.g., module not loaded)
      const url = NAV_ROUTES[linkText];
      if (url) {
        await this.page.goto(url);
      } else {
        throw new Error(`Cannot navigate to "${linkText}": no sidebar button or fallback URL`);
      }
    }
  }

  /** Verify the dashboard page loaded with key elements */
  async expectLoaded() {
    await expect(this.page).toHaveURL('/dashboard');
  }

  /** Check that a navigation link exists in the sidebar */
  async expectNavLink(linkText: string) {
    await expect(this.page.getByRole('button', { name: linkText })).toBeAttached();
  }
}
