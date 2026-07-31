import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { expectFailure, expectSuccess, withApiContext } from '../fixtures/api';

test.describe('Orders API', () => {
  test('requires authentication', async () => {
    await withApiContext(undefined, async (request) => {
      const response = await request.get('/api/orders');
      await expectFailure(response, 401);
    });
  });

  test('creates, reads, approves, cancels, and returns orders', async () => {
    const seed = loadSeedData();
    const product = seed.products[0];

    await withApiContext(ownerStorageStatePath, async (request) => {
      const create = await request.post('/api/orders', {
        data: {
          customerName: 'API Orders Customer',
          items: [
            {
              productId: product.id,
              name: product.name,
              quantity: 1,
              price: product.price,
              lineTotal: product.price,
            },
          ],
          subtotal: product.price,
          taxAmount: 0,
          totalAmount: product.price,
          status: 'PENDING_APPROVAL',
        },
      });

      const created = await expectSuccess(create, 200);
      const orderId = created.data.order._id as string;
      expect(created.data.order.status).toBe('PENDING_APPROVAL');

      const getOrder = await request.get(`/api/orders/${orderId}`);
      const fetched = await expectSuccess(getOrder, 200);
      expect(fetched.data.order._id).toBe(orderId);

      const approve = await request.post(`/api/orders/${orderId}/approve`);
      const approved = await expectSuccess(approve, 200);
      expect(approved.data.order.status).toBe('COMPLETED');

      const completedReturn = await request.post('/api/returns', {
        data: {
          originalOrderId: orderId,
          notes: 'Testing return flow',
          items: [
            {
              productId: product.id,
              quantity: 1,
              price: product.price,
            },
          ],
        },
      });
      const returned = await expectSuccess(completedReturn, 201);
      expect(returned.data.returned.originalOrderId).toBe(orderId);

      const cancel = await request.post(`/api/orders/${seed.orders.pending.id}/cancel`);
      const cancelled = await expectSuccess(cancel, 200);
      expect(cancelled.data.order.status).toBe('CANCELLED');

      const list = await request.get('/api/orders?limit=5&search=API');
      const listed = await expectSuccess(list, 200);
      expect(Array.isArray(listed.data.orders)).toBe(true);
    });
  });

  test('rejects malformed payloads', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const response = await request.post('/api/orders', {
        data: {
          customerName: 'Broken',
          items: [],
        },
      });

      const payload = await expectFailure(response, 400);
      expect(String(payload.message)).toMatch(/validation/i);
    });
  });
});
