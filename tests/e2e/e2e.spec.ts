import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { AddProductPage } from '../page-objects/AddProductPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { OrdersPage } from '../page-objects/OrdersPage';
import { ProductsPage } from '../page-objects/ProductsPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('End-to-End', () => {
  test('walks through catalog creation, barcode billing, approval, and reporting', async ({ page }) => {
    const seed = loadSeedData();
    const dashboard = new DashboardPage(page);
    const addProduct = new AddProductPage(page);
    const products = new ProductsPage(page);
    const orders = new OrdersPage(page);
    const productName = `E2E Product ${seed.runId}`;
    const scannedProduct = seed.products.find((entry) => entry.barcode);
    const barcode = scannedProduct?.barcode || '';

    await dashboard.goto('/');
    await dashboard.expectHeading(/Welcome back/i);

    await dashboard.open('Add Product');
    await addProduct.fillProduct({
      name: productName,
      category: seed.categories.accessories.name,
      price: 899,
      stock: 10,
      costPrice: 500,
      sku: `E2E-${seed.runId}`,
      description: 'E2E created product',
    });

    const createPromise = page.waitForResponse((response) => response.url().endsWith('/api/product') && response.request().method() === 'POST' && response.ok());
    await addProduct.submit();
    await createPromise;

    await products.goto('/products');
    await expect(page.locator('body').getByText(productName, { exact: false }).first()).toBeVisible();

    await orders.goto('/orders');
    await orders.scan(barcode);
    await expect(page.locator('body').getByText(/added to the cart|added from/i).first()).toBeVisible();
    await orders.quickAdd(seed.products[0].name);
    await expect(page.locator('body').getByText(seed.products[0].name, { exact: false }).first()).toBeVisible();
    await orders.checkoutButton.click();
    await expect(page.locator('body').getByText(/waiting for owner approval/i).first()).toBeVisible();

    await page.goto('/orders');
    await expect(page.locator('body').getByText(seed.orders.pending.orderNumber, { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: /approve/i }).first().click();
    await expect(page.locator('body').getByText(/approved/i).first()).toBeVisible();

    await page.goto('/reports');
    await expect(page.locator('body').getByText('Revenue Trend').first()).toBeVisible();
    await expect(page.locator('body').getByText(seed.categories.accessories.name, { exact: false }).first()).toBeVisible();
  });
});
