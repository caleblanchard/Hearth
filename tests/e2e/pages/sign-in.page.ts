import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Sign-In page (/auth/signin).
 */
export class SignInPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorAlert: Locator;
  readonly signUpLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.errorAlert = page.locator('[role="alert"]');
    this.signUpLink = page.getByRole('link', { name: 'Sign up' });
    this.heading = page.getByRole('heading', { name: 'Welcome Back' });
  }

  async goto() {
    await this.page.goto('/auth/signin');
    await this.page.waitForLoadState('networkidle');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async expectError() {
    await expect(this.errorAlert).toBeVisible();
  }
}
