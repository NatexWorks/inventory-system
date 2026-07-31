import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class OrdersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  searchInput = this.page.getByPlaceholder('Search orders...');
  barcodeInput = this.page.getByPlaceholder('Scan or type barcode');
  scanButton = this.page.getByRole('button', { name: 'Scan' });
  checkoutButton = this.page.getByRole('button', { name: 'Create Pending Bill' });
  clearButton = this.page.getByRole('button', { name: 'Clear' });

  async scan(code: string) {
    await this.barcodeInput.fill(code);
    await this.scanButton.click();
  }

  async quickAdd(name: string) {
    await this.page.getByRole('button', { name }).click();
  }

  async expectCartItem(name: string) {
    await expect(this.page.getByText(name, { exact: false })).toBeVisible();
  }

  async approve(orderNumber: string) {
    const row = this.page.getByRole('row', { name: new RegExp(orderNumber) });
    await row.getByRole('button', { name: 'Approve' }).click();
  }

  async cancel(orderNumber: string) {
    const row = this.page.getByRole('row', { name: new RegExp(orderNumber) });
    await row.getByRole('button', { name: 'Cancel' }).click();
  }
}
