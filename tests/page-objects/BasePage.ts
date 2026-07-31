import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(route: string) {
    await this.page.goto(route);
  }

  heading(name: string | RegExp): Locator {
    return this.page.getByRole('heading', { name });
  }

  async expectHeading(name: string | RegExp) {
    await expect(this.heading(name).first()).toBeVisible();
  }

  async expectUrl(pathname: string | RegExp) {
    await expect(this.page).toHaveURL(pathname);
  }

  async expectAlert(text: string | RegExp) {
    await expect(this.page.locator('body').getByText(text, { exact: false }).first()).toBeVisible();
  }
}
