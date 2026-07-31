import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { ReportsPage } from '../page-objects/ReportsPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Reports', () => {
  test('renders revenue charts and filters category analytics', async ({ page }) => {
    const reports = new ReportsPage(page);
    const seed = loadSeedData();

    await reports.goto('/reports');
    await reports.expectHeading(/Reports Dashboard/i);
    await expect(page.locator('body').getByText('Sales Revenue').first()).toBeVisible();
    await expect(page.locator('body').getByText('Revenue Trend').first()).toBeVisible();
    await expect(page.locator('body').getByText(seed.categories.devices.name, { exact: false }).first()).toBeVisible();

    await reports.search(seed.categories.accessories.name);
    await expect(page.locator('body').getByText(seed.categories.accessories.name, { exact: false }).first()).toBeVisible();
    await expect(page.locator('body').getByText(seed.categories.devices.name, { exact: false })).toHaveCount(0);

    await reports.exportButton.click();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
  });
});
