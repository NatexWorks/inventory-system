import { expect, test } from '@playwright/test';
import { ownerStorageStatePath } from '../fixtures/testData';
import { SuppliersPage } from '../page-objects/SuppliersPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Suppliers', () => {
  test('renders the supplier directory and responds to search input', async ({ page }) => {
    const suppliers = new SuppliersPage(page);

    await suppliers.goto('/suppliers');
    await suppliers.expectHeading(/Supplier Directory/i);
    await expect(page.getByText('Tech World Distributors')).toBeVisible();
    await expect(page.getByText('AccessPoint Supplies')).toBeVisible();

    await suppliers.search('Global');
    await expect(page.getByText('Global Electronics Co.', { exact: false })).toBeVisible();
  });
});
