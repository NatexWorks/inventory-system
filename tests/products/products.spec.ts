import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { AuthPage } from '../page-objects/AuthPage';
import { ProductsPage } from '../page-objects/ProductsPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Products', () => {
  test('searches, paginates, edits, and deletes catalog items', async ({ page }) => {
    const auth = new AuthPage(page);
    const products = new ProductsPage(page);
    const seed = loadSeedData();
    const featuredProduct = seed.products.at(-1)!;

    await auth.goto('/login');
    await auth.login(seed.users.owner.email, seed.users.owner.password);

    const loadProducts = page.waitForResponse((response) => response.url().includes('/api/product?page=1') && response.request().method() === 'GET' && response.ok());
    await products.goto('/products');
    await loadProducts;
    await products.expectHeading(/Products List/i);
    await products.expectProductVisible(featuredProduct.name);

    await products.search(featuredProduct.name);
    await products.expectProductVisible(featuredProduct.name);

    await products.resetButton.click();
    await products.expectProductVisible(featuredProduct.name);
    await page.getByRole('button', { name: /^2$/ }).click();

    const secondPageProduct = seed.products[0];
    await products.expectProductVisible(secondPageProduct.name);

    const lastProduct = seed.products[11];
    await products.openEdit(secondPageProduct.name);
    await expect(page).toHaveURL(new RegExp(`/addProducts\\?id=${secondPageProduct.id}`));
    await expect(page.locator('h1').filter({ hasText: 'Edit Product' })).toBeVisible();

    await page.goto('/products');
    const visibleProductRow = page.locator('tbody tr').first();
    const visibleProductName = await visibleProductRow.locator('p').first().textContent();
    await expect(visibleProductRow).toBeVisible();
    await products.deleteProduct(visibleProductName!.trim());
    await expect(page.getByText(visibleProductName!.trim(), { exact: false })).toHaveCount(0);
  });
});
