import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { ReportsPage } from '../page-objects/ReportsPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Reports', () => {
  test('shows selectable sales periods, report types, and exports CSV data', async ({ page }) => {
    const reports = new ReportsPage(page);
    const seed = loadSeedData();

    await reports.goto('/reports');
    await reports.expectHeading(/Reports Dashboard/i);
    await expect(page.getByRole('button', { name: '1 Day' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1 Month' })).toBeVisible();
    await expect(page.getByRole('button', { name: '3 Months' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1 Year' })).toBeVisible();
    await expect(page.getByText('Sales Trend', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sales Report' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Orders Report' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inventory Report' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Product Performance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Category Report' })).toBeVisible();
    await expect(page.getByText(seed.categories.devices.name, { exact: false }).first()).toBeVisible();

    await reports.search(seed.categories.accessories.name);
    await expect(page.getByText(seed.categories.accessories.name, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(seed.categories.devices.name, { exact: false })).toHaveCount(0);

    const downloadPromise = page.waitForEvent('download');
    await reports.exportCsvButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/sales-report-month-.*\.csv$/);
  });

  test('loads sales trend when the time range changes', async ({ page }) => {
    const reports = new ReportsPage(page);
    await reports.goto('/reports');
    await reports.expectHeading(/Reports Dashboard/i);

    await page.getByRole('button', { name: '1 Day' }).click();
    await expect(page.getByText('Today', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '1 Day' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: '3 Months' }).click();
    await expect(page.getByRole('button', { name: '3 Months' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Last 90 days', { exact: false }).first()).toBeVisible();
  });
});
