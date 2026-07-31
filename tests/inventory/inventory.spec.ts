import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { AddProductPage } from '../page-objects/AddProductPage';
import { ProductsPage } from '../page-objects/ProductsPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Inventory', () => {
  test('creates a product from the form and reveals it on the products list', async ({ page }) => {
    const addProduct = new AddProductPage(page);
    const seed = loadSeedData();
    const name = `Desk Lamp ${seed.runId}`;

    await addProduct.goto('/addProducts');
    await addProduct.expectMode('Add New Product');
    await addProduct.fillProduct({
      name,
      category: seed.categories.accessories.name,
      price: 599,
      stock: 9,
      costPrice: 300,
      sku: `LAMP-${seed.runId}`,
      description: 'A bright work desk lamp',
    });

    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/product') && response.request().method() === 'POST' && response.ok());
    await addProduct.submit();
    await responsePromise;

    await page.goto('/products');
    await expect(page.locator('body').getByText(name, { exact: false }).first()).toBeVisible();
  });

  test('updates an existing product from edit mode', async ({ page }) => {
    const addProduct = new AddProductPage(page);
    const products = new ProductsPage(page);
    const seed = loadSeedData();
    const target = seed.products[1];

    await addProduct.goto(`/addProducts?id=${target.id}`);
    await addProduct.expectMode('Edit Product');
    await expect(addProduct.nameInput).toHaveValue(target.name);

    await addProduct.priceInput.fill(String(target.price + 50));
    await addProduct.stockInput.fill(String(target.stock + 1));

    const responsePromise = page.waitForResponse((response) => response.url().includes(`/api/product/${target.id}`) && response.request().method() === 'PUT' && response.ok());
    await addProduct.submit();
    await responsePromise;

    await products.goto('/products');
    await products.search(target.name);
    await expect(page.locator('body').getByText(String(target.price + 50)).first()).toBeVisible();
  });
});
