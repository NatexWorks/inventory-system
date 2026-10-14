import { test } from '@playwright/test';
import { expectFailure, withApiContext } from '../fixtures/api';

test.describe('Security regression checks', () => {
  test('does not expose workspace data through unauthenticated read endpoints', async () => {
    await withApiContext(undefined, async (request) => {
      const paths = [
        '/api/auth/me',
        '/api/product?limit=1',
        '/api/category',
        '/api/orders',
        '/api/dashboard',
        '/api/reports',
        '/api/settings',
        '/api/sessions',
      ];

      for (const path of paths) {
        const response = await request.get(path);
        await expectFailure(response, 401);
      }
    });
  });

  test('does not allow unauthenticated state-changing requests', async () => {
    await withApiContext(undefined, async (request) => {
      const attempts = [
        () => request.post('/api/product', { data: { name: 'Unauthorized Product', price: 1, stock: 1 } }),
        () => request.post('/api/category', { data: { name: 'Unauthorized Category' } }),
        () => request.post('/api/orders', { data: { items: [] } }),
        () => request.post('/api/returns', { data: { originalOrderId: '000000000000000000000000', items: [] } }),
        () => request.post('/api/barcodes/scan', { data: { barcode: 'UNAUTHORIZED-CODE' } }),
        () => request.put('/api/settings', { data: { billing: { taxPercentage: 99 } } }),
        () => request.post('/api/sessions', { data: { name: 'Unauthorized Session' } }),
      ];

      for (const attempt of attempts) {
        const response = await attempt();
        await expectFailure(response, 401);
      }
    });
  });
});
