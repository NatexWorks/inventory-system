import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AddProductPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  nameInput = this.page.getByLabel('Product Name');
  categorySelect = this.page.getByLabel('Category');
  priceInput = this.page.getByLabel('Product Price');
  costPriceInput = this.page.getByLabel('Cost Price');
  stockInput = this.page.getByLabel('Product Stock');
  skuInput = this.page.getByLabel('SKU');
  descriptionInput = this.page.getByLabel('Product Description');

  async fillProduct(input: {
    name: string;
    category: string;
    price: string | number;
    stock: string | number;
    costPrice?: string | number;
    sku?: string;
    description?: string;
  }) {
    await this.nameInput.fill(input.name);
    await this.categorySelect.selectOption({ label: input.category });
    await this.priceInput.fill(String(input.price));
    if (input.costPrice !== undefined) {
      await this.costPriceInput.fill(String(input.costPrice));
    }
    await this.stockInput.fill(String(input.stock));
    if (input.sku !== undefined) {
      await this.skuInput.fill(input.sku);
    }
    if (input.description !== undefined) {
      await this.descriptionInput.fill(input.description);
    }
  }

  async submit() {
    await this.page.getByRole('button', { name: /add product|edit product/i }).click();
  }

  async expectMode(mode: 'Add New Product' | 'Edit Product') {
    await expect(this.page.getByRole('heading', { name: mode, exact: true }).first()).toBeVisible();
  }
}
