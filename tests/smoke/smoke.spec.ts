import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { getAppRouteSummary } from '../utils/discover';

test.use({ storageState: ownerStorageStatePath });

const expectedHeadings: Record<string, RegExp> = {
  '/': /Welcome back/i,
  '/addProducts': /Add New Product/i,
  '/categories': /Category Overview/i,
  '/orders': /Orders Overview/i,
  '/products': /Products List/i,
  '/reports': /Reports Dashboard/i,
  '/settings': /Account Settings/i,
  '/suppliers': /Supplier Directory/i,
};

test.describe('Smoke', () => {
  test('all discovered pages are reachable and render core headings', async ({ page }) => {
    const { pages } = getAppRouteSummary();
    const seed = loadSeedData();

    for (const discovered of pages.filter((entry) => discoveredPageIsCovered(entry.route))) {
      await page.goto(discovered.route);
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(discovered.route)}$`));
      const heading = expectedHeadings[discovered.route];
      if (heading) {
        await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      }
    }

    await page.goto('/products');
    await expect(page.locator('body').getByText(seed.products[0].name, { exact: false }).first()).toBeVisible();
  });

  test('public auth pages render without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /login to continue/i })).toBeVisible();
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /start your inventory workspace/i })).toBeVisible();
  });
});

function discoveredPageIsCovered(route: string) {
  return ['/', '/addProducts', '/categories', '/orders', '/products', '/reports', '/settings', '/suppliers'].includes(route);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
