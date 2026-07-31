import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { AddProductPage } from '../page-objects/AddProductPage';
import { CategoriesPage } from '../page-objects/CategoriesPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { ProductsPage } from '../page-objects/ProductsPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Regression', () => {
  test('keeps the main workspace flow intact across routes', async ({ page }) => {
    const seed = loadSeedData();
    const dashboard = new DashboardPage(page);
    const categories = new CategoriesPage(page);
    const addProduct = new AddProductPage(page);
    const products = new ProductsPage(page);

    await dashboard.goto('/');
    await dashboard.open('Categories');
    await expect(page.locator('body').getByText(seed.categories.devices.name, { exact: false }).first()).toBeVisible();

    await categories.goto('/categories');
    await categories.searchInput.fill(seed.categories.consumables.name);
    await expect(page.locator('body').getByText(seed.categories.consumables.name, { exact: false }).first()).toBeVisible();

    await dashboard.open('Add Product');
    await addProduct.fillProduct({
      name: `Regression ${seed.runId}`,
      category: seed.categories.devices.name,
      price: 1234,
      stock: 2,
      costPrice: 900,
      sku: `REG-${seed.runId}`,
      description: 'Regression coverage product',
    });

    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/product') && response.request().method() === 'POST' && response.ok());
    await addProduct.submit();
    await responsePromise;

    await products.goto('/products');
    await expect(page.locator('body').getByText(`Regression ${seed.runId}`, { exact: false }).first()).toBeVisible();
    await products.search(seed.products[0].name);
    await expect(page.locator('body').getByText(seed.products[0].name, { exact: false }).first()).toBeVisible();

    await dashboard.open('Settings');
    await expect(page.locator('body').getByText('Connected to backend').first()).toBeVisible();
    await dashboard.open('Reports');
    await expect(page.locator('body').getByText('Category Analytics').first()).toBeVisible();
  });
});
