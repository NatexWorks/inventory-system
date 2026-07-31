import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { expectFailure, expectSuccess, withApiContext } from '../fixtures/api';

test.describe('Catalog API', () => {
  test('rejects category requests without auth', async () => {
    await withApiContext(undefined, async (request) => {
      const response = await request.get('/api/category');
      await expectFailure(response, 401);
    });
  });

  test('creates, updates, lists, and deletes categories', async () => {
    const seed = loadSeedData();

    await withApiContext(ownerStorageStatePath, async (request) => {
      const create = await request.post('/api/category', {
        data: { name: `API Category ${seed.runId}`, description: 'API created category' },
      });
      const created = await expectSuccess(create, 201);
      expect(created.data.category.name).toContain(`API Category ${seed.runId}`);

      const list = await request.get('/api/category');
      const listed = await expectSuccess(list, 200);
      expect(Array.isArray(listed.data.categories)).toBe(true);

      const update = await request.put(`/api/category/${created.data.category._id}`, {
        data: { name: `API Category Updated ${seed.runId}`, description: 'Updated through API' },
      });
      const updated = await expectSuccess(update, 200);
      expect(updated.data.category.name).toContain('Updated');

      const remove = await request.delete(`/api/category/${created.data.category._id}`);
      const removed = await expectSuccess(remove, 200);
      expect(removed.data.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  test('validates category payloads', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const response = await request.post('/api/category', {
        data: { description: 'missing name' },
      });
      const payload = await expectFailure(response, 400);
      expect(String(payload.message)).toMatch(/validation/i);
    });
  });

  test('creates, reads, updates, and removes products', async () => {
    const seed = loadSeedData();

    await withApiContext(ownerStorageStatePath, async (request) => {
      const create = await request.post('/api/product', {
        data: {
          name: `API Product ${seed.runId}`,
          price: 555,
          stock: 7,
          costPrice: 333,
          categoryId: seed.categories.accessories.id,
          category: seed.categories.accessories.name,
          sku: `API-${seed.runId}`,
          description: 'Created via API',
          barcodes: [{ code: `API-${seed.runId}-001`, state: 'AVAILABLE' }],
        },
      });
      const created = await expectSuccess(create, 200);
      const productId = created.data.product._id as string;
      expect(created.data.product.name).toContain(`API Product ${seed.runId}`);

      const getProduct = await request.get(`/api/product/${productId}`);
      const fetched = await expectSuccess(getProduct, 200);
      expect(fetched.data.product._id).toBe(productId);

      const update = await request.put(`/api/product/${productId}`, {
        data: {
          name: `API Product Updated ${seed.runId}`,
          price: 599,
          stock: 8,
          costPrice: 355,
          categoryId: seed.categories.devices.id,
          category: seed.categories.devices.name,
          sku: `APIUP-${seed.runId}`,
          description: 'Updated via API',
          barcodes: [{ code: `API-${seed.runId}-001`, state: 'AVAILABLE' }],
        },
      });
      const updated = await expectSuccess(update, 200);
      expect(updated.data.product.price).toBe(599);

      const list = await request.get('/api/product?page=1&limit=5&search=API');
      const listed = await expectSuccess(list, 200);
      expect(Array.isArray(listed.data.products)).toBe(true);

      const remove = await request.delete(`/api/product/${productId}`);
      await expectSuccess(remove, 200);
    });
  });

  test('validates product payloads', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const response = await request.post('/api/product', {
        data: { name: '', price: -1, stock: -2 },
      });
      const payload = await expectFailure(response, 400);
      expect(String(payload.message)).toMatch(/validation/i);
    });
  });

  test('scans barcodes and returns matching products', async () => {
    const seed = loadSeedData();
    const barcode = seed.products.find((product) => product.barcode)?.barcode;
    expect(barcode).toBeTruthy();

    await withApiContext(ownerStorageStatePath, async (request) => {
      const response = await request.post('/api/barcodes/scan', {
        data: { barcode },
      });
      const payload = await expectSuccess(response, 200);
      expect(payload.data.product.name).toContain('Barcode Scanner');

      const missing = await request.post('/api/barcodes/scan', {
        data: { barcode: 'MISSING-CODE-000' },
      });
      await expectFailure(missing, 404);
    });
  });

  test('returns dashboard, reports, and settings payloads', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const dashboard = await request.get('/api/dashboard');
      const dashboardPayload = await expectSuccess(dashboard, 200);
      expect(dashboardPayload.data.summary.totalProducts).toBeGreaterThan(0);

      const reports = await request.get('/api/reports');
      const reportsPayload = await expectSuccess(reports, 200);
      expect(Array.isArray(reportsPayload.data.categories.analytics)).toBe(true);

      const settings = await request.get('/api/settings');
      const settingsPayload = await expectSuccess(settings, 200);
      expect(settingsPayload.data.settings.billing.invoiceEnabled).toBe(true);
    });
  });
});
