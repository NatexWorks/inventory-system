import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  fullNameInput = this.page.getByPlaceholder('Enter full name');
  emailAddressInput = this.page.getByPlaceholder('Enter email address');
  phoneNumberInput = this.page.getByPlaceholder('Enter phone number');
  storeNameInput = this.page.getByPlaceholder('Enter store name');
  storeEmailInput = this.page.getByPlaceholder('Enter store email');
  storeAddressInput = this.page.getByPlaceholder('Enter store address');
  currentPasswordInput = this.page.getByPlaceholder('Enter current password');
  newPasswordInput = this.page.getByPlaceholder('Enter new password');
  confirmPasswordInput = this.page.getByPlaceholder('Enter confirm password');
  lowStockThreshold = this.page.getByPlaceholder('Enter low stock threshold');
  taxPercentage = this.page.getByPlaceholder('Enter tax percentage');
  invoiceFormat = this.page.getByLabel('Invoice Format');
  barcodeRules = this.page.getByPlaceholder('Enter barcode rules');
  autoBarcodeGeneration = this.page.getByLabel('Auto Barcode Generation');
  offlineMode = this.page.getByLabel('Offline Mode');
  sessionTimeoutMinutes = this.page.getByPlaceholder('Enter session timeout minutes');
  saveButton = this.page.getByRole('button', { name: 'Save Changes' });

  async save() {
    await this.saveButton.click();
  }

  async expectSaved() {
    await expect(this.page.locator('body').getByText('Settings saved successfully', { exact: false }).first()).toBeVisible();
  }
}
