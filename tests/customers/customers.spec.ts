import { expect, test } from '@playwright/test';
import { ownerStorageStatePath } from '../fixtures/testData';

test.use({ storageState: ownerStorageStatePath });

test.describe('Customers route coverage', () => {
  test('returns a 404 because no customers module is implemented in the app', async ({ page }) => {
    const response = await page.goto('/customers');
    expect(response?.status()).toBe(404);
    await expect(page.locator('body')).toContainText(/404|not found|could not be found/i);
  });
});
