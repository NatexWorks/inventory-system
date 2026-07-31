import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  emailInput = this.page.getByLabel('Email');
  passwordInput = this.page.getByLabel('Password');
  nameInput = this.page.getByLabel('Full Name');
  roleSelect = this.page.getByLabel('Account Type');
  submitButton = this.page.getByRole('button', { name: /login|create account/i });

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.page.getByRole('button', { name: /^login$/i }).click();
  }

  async signup(name: string, email: string, password: string, role: 'owner' | 'staff' = 'owner') {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.roleSelect.selectOption(role);
    await this.page.getByRole('button', { name: /create account/i }).click();
  }

  async expectError(text: string | RegExp) {
    await expect(this.page.locator('body').getByText(text, { exact: false }).first()).toBeVisible();
  }
}
