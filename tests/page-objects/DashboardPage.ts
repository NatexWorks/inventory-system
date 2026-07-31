import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  sidebarLink(name: string) {
    return this.page.getByRole('link', { name });
  }

  async logout() {
    await this.page.getByRole('button', { name: /logout/i }).click();
  }

  async open(routeName: 'Add Product' | 'Products' | 'Categories' | 'Orders' | 'Suppliers' | 'Reports' | 'Settings') {
    await this.sidebarLink(routeName).click();
  }

  async clickQuickAction(name: string) {
    await this.page.getByRole('button', { name }).click();
  }
}
