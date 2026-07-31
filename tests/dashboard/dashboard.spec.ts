import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { DashboardPage } from '../page-objects/DashboardPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Dashboard', () => {
  test('shows seeded metrics and navigates through quick actions', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const seed = loadSeedData();

    await dashboard.goto('/');
    await dashboard.expectHeading(/Welcome back/i);

    await expect(page.locator('body').getByText('Total Products').first()).toBeVisible();
    await expect(page.locator('body').getByText('Total Revenue').first()).toBeVisible();
    await expect(page.locator('body').getByText(seed.users.owner.name).first()).toBeVisible();
    await expect(page.locator('table').getByText(seed.orders.completed.orderNumber, { exact: false }).first()).toBeVisible();
    await expect(page.locator('body').getByText(seed.products[0].name).first()).toBeVisible();

    await dashboard.open('Products');
    await expect(page).toHaveURL(/\/products/);
    await dashboard.open('Dashboard');
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('button', { name: /close sidebar/i }).click();
    await expect(page.getByRole('button', { name: /open sidebar/i })).toBeVisible();
    await page.getByRole('button', { name: /open sidebar/i }).click();
    await expect(page.getByRole('button', { name: /close sidebar/i })).toBeVisible();

    await dashboard.clickQuickAction('Add Product');
    await expect(page).toHaveURL(/\/addProducts/);
  });
});
