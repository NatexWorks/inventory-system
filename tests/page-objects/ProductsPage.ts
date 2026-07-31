import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  searchInput = this.page.getByRole('textbox', { name: 'Search products...' }).first();
  resetButton = this.page.getByRole('button', { name: 'Reset' });
  addProductLink = this.page.getByRole('link', { name: 'Add Product' });

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async expectProductVisible(name: string) {
    const productRow = this.page.locator('tbody tr').filter({ hasText: name }).first();
    await expect(productRow).toBeVisible();
  }

  async openEdit(name: string) {
    await this.page.getByLabel(`Edit ${name}`).click();
  }

  async deleteProduct(name: string) {
    await this.page.getByLabel(`Delete ${name}`).click();
  }
}
