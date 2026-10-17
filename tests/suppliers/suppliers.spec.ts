import { expect, test } from '@playwright/test';
import { ownerStorageStatePath } from '../fixtures/testData';
import { SuppliersPage } from '../page-objects/SuppliersPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Suppliers', () => {
  test('renders the supplier directory and responds to search input', async ({ page }) => {
    await page.route('**/api/suppliers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            suppliers: [
              { _id: 'supplier-1', name: 'Tech World Distributors', contact: '+91 98765 43210', email: 'sales@techworld.example', address: 'Nehru Place', products: 25, rating: 4.9, status: 'Active' },
              { _id: 'supplier-2', name: 'Global Electronics Co.', contact: '+91 98123 45678', email: 'orders@globalelec.example', address: 'Sector 18', products: 18, rating: 4.7, status: 'Active' },
              { _id: 'supplier-3', name: 'AccessPoint Supplies', contact: '+91 90000 11223', email: 'hello@accesspoint.example', address: 'Indirapuram', products: 30, rating: 4.8, status: 'Active' },
            ],
          },
        }),
      });
    });
    const suppliers = new SuppliersPage(page);

    await suppliers.goto('/suppliers');
    await suppliers.expectHeading(/Supplier Directory/i);
    await expect(page.getByLabel('Supplier name')).toHaveCount(3);
    await expect(page.getByLabel('Supplier name').nth(0)).toHaveValue('Tech World Distributors');
    await expect(page.getByLabel('Supplier name').nth(2)).toHaveValue('AccessPoint Supplies');

    await suppliers.search('Global');
    await expect(page.getByLabel('Supplier name')).toHaveCount(1);
    await expect(page.getByLabel('Supplier name')).toHaveValue('Global Electronics Co.');
  });
});
