import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { CategoriesPage } from '../page-objects/CategoriesPage';

test.use({ storageState: ownerStorageStatePath });

test.describe('Categories', () => {
  test('creates, updates, searches, and deletes categories safely', async ({ page }) => {
    const categories = new CategoriesPage(page);
    const seed = loadSeedData();
    const name = `Office Gear ${seed.runId}`;

    await categories.goto('/categories');
    await categories.expectHeading(/Category Overview/i);
    await expect(page.locator('body').getByText(seed.categories.devices.name, { exact: false }).first()).toBeVisible();

    await categories.fillForm(name, 'Fixtures for office hardware');
    await categories.submit();
    await expect(page.locator('body').getByText('Category created successfully').first()).toBeVisible();
    await expect(page.locator('body').getByText(name, { exact: false }).first()).toBeVisible();

    const card = page.locator('article').filter({ hasText: name });
    await card.getByRole('button', { name: 'Edit' }).click();
    await categories.nameInput.fill(`${name} Updated`);
    await categories.descriptionInput.fill('Updated category description');
    await categories.submit();
    await expect(page.locator('body').getByText('Category updated successfully').first()).toBeVisible();
    await expect(page.locator('body').getByText(`${name} Updated`, { exact: false }).first()).toBeVisible();

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    const updatedCard = page.locator('article').filter({ hasText: `${name} Updated` });
    await updatedCard.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('body').getByText('Category deleted successfully').first()).toBeVisible();
    await expect(page.locator('body').getByText(`${name} Updated`, { exact: false })).toHaveCount(0);
  });

  test('filters category cards and resets the search', async ({ page }) => {
    const categories = new CategoriesPage(page);
    const seed = loadSeedData();

    await categories.goto('/categories');
    await categories.searchInput.fill(seed.categories.accessories.name);
    await expect(page.locator('body').getByText(seed.categories.accessories.name, { exact: false }).first()).toBeVisible();
    await categories.reset();
    await expect(categories.searchInput).toHaveValue('');
  });
});
