import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CategoriesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  nameInput = this.page.getByPlaceholder('Enter category name');
  descriptionInput = this.page.getByPlaceholder('Optional category description');
  searchInput = this.page.getByPlaceholder('Search categories...');

  async fillForm(name: string, description = '') {
    await this.nameInput.fill(name);
    await this.descriptionInput.fill(description);
  }

  async submit() {
    await this.page.getByRole('button', { name: /create category|update category/i }).click();
  }

  async reset() {
    await this.page.getByRole('button', { name: 'Reset' }).click();
  }

  async expectCategoryVisible(name: string) {
    await expect(this.page.getByRole('heading', { name })).toBeVisible();
  }
}
