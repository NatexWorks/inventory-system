import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  emailInput = this.page.getByLabel('Email');
  passwordInput = this.page.getByLabel('Password');
  nameInput = this.page.getByLabel('Full Name');
  otpInput = this.page.getByLabel('Email verification code');
  submitButton = this.page.getByRole('button', { name: /login|create account/i });

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.page.getByRole('button', { name: /^login$/i }).click();
  }

  async signup(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.page.getByRole('button', { name: /send verification code/i }).click();

    const debugMessage = await this.page.getByText(/Development OTP:/).textContent();
    const otp = debugMessage?.match(/[0-9]{6}/)?.[0];
    if (!otp) {
      throw new Error('No local test OTP was displayed. Check the Playwright OTP_DEV_RETURN_CODE setting.');
    }

    await this.otpInput.fill(otp);
    await this.page.getByRole('button', { name: /verify code & create account/i }).click();
  }

  async expectError(text: string | RegExp) {
    await expect(this.page.locator('body').getByText(text, { exact: false }).first()).toBeVisible();
  }
}
