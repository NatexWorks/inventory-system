import { expect, test } from '@playwright/test';
import { ownerStorageStatePath } from '../fixtures/testData';
import { SettingsPage } from '../page-objects/SettingsPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Settings', () => {
  test('updates profile and backend settings', async ({ page }) => {
    const settings = new SettingsPage(page);

    await settings.goto('/settings');
    await settings.expectHeading(/Account Settings/i);
    await expect(page.locator('body').getByText('Connected to backend').first()).toBeVisible();

    await settings.fullNameInput.fill('QA Owner');
    await settings.emailAddressInput.fill('qa.owner@example.com');
    await settings.phoneNumberInput.fill('+91 99999 00000');
    await settings.storeNameInput.fill('QA Mart');
    await settings.storeEmailInput.fill('store@qa-mart.example');
    await settings.storeAddressInput.fill('HQ Floor, Inventory City');
    await settings.currentPasswordInput.fill('Password123!');
    await settings.newPasswordInput.fill('Password123!');
    await settings.confirmPasswordInput.fill('Password123!');
    await page.getByPlaceholder('Enter low stock alerts').fill('Enabled');

    await settings.lowStockThreshold.fill('4');
    await settings.taxPercentage.fill('18');
    await settings.invoiceFormat.selectOption('thermal');
    await settings.barcodeRules.fill('Auto-generate unit barcodes');
    await settings.autoBarcodeGeneration.selectOption('true');
    await settings.offlineMode.selectOption('false');
    await settings.sessionTimeoutMinutes.fill('45');

    await settings.save();
    await settings.expectSaved();

    await page.reload();
    await expect(settings.lowStockThreshold).toHaveValue('4');
    await expect(settings.taxPercentage).toHaveValue('18');
    await expect(settings.sessionTimeoutMinutes).toHaveValue('45');
  });
});
