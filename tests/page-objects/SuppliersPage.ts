import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SuppliersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  searchInput = this.page.getByPlaceholder('Search suppliers...');

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async expectSupplier(name: string) {
    await expect(this.page.getByText(name, { exact: false })).toBeVisible();
  }
}
