import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReportsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  searchInput = this.page.getByPlaceholder('Search categories...');
  exportCsvButton = this.page.getByRole('button', { name: 'Export CSV' });
  exportPdfButton = this.page.getByRole('button', { name: 'Export PDF' });

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async expectCategory(name: string) {
    await expect(this.page.getByText(name, { exact: false })).toBeVisible();
  }
}
