import { expect, test } from '@playwright/test';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { expectSuccess, withApiContext } from '../fixtures/api';

type LowStockNotification = {
  id: string;
  productId: string;
  kind: string;
  isRead: boolean;
  active: boolean;
  message: string;
};

test.describe('Low-stock notification lifecycle', () => {
  test('creates one unread alert per low-stock episode, tracks reads, and alerts again after recovery', async () => {
    const seed = loadSeedData();
    const unique = Date.now();
    let productId: string | null = null;

    await withApiContext(ownerStorageStatePath, async (request) => {
      try {
        // Establish the account's existing notification count before creating the test item.
        const initialResponse = await request.get('/api/notifications');
        const initial = await expectSuccess(initialResponse, 200);
        expect(Array.isArray(initial.data.notifications)).toBe(true);
        expect(initial.data.notifications.every((item: LowStockNotification) =>
          item.kind === 'Low stock' || item.kind === 'Out of stock'
        )).toBe(true);

        const create = await request.post('/api/product', {
          data: {
            name: `Notification Test Product ${seed.runId} ${unique}`,
            price: 100,
            costPrice: 50,
            stock: 1,
            categoryId: seed.categories.accessories.id,
            category: seed.categories.accessories.name,
            sku: `NTEST-${seed.runId}-${unique}`,
          },
        });
        const created = await expectSuccess(create, 200);
        productId = String(created.data.product._id);

        const firstResponse = await request.get('/api/notifications');
        const first = await expectSuccess(firstResponse, 200);
        const firstAlert = (first.data.notifications as LowStockNotification[]).find(
          (item) => item.productId === productId && item.active
        );
        expect(firstAlert).toBeTruthy();
        expect(firstAlert!.isRead).toBe(false);
        expect(firstAlert!.kind).toBe('Low stock');
        const firstAlertId = firstAlert!.id;

        // Repeated polling while the stock is still low must not create or unread another event.
        const repeatedResponse = await request.get('/api/notifications');
        const repeated = await expectSuccess(repeatedResponse, 200);
        const repeatedAlerts = (repeated.data.notifications as LowStockNotification[]).filter(
          (item) => item.productId === productId && item.active
        );
        expect(repeatedAlerts).toHaveLength(1);
        expect(repeatedAlerts[0].id).toBe(firstAlertId);
        expect(repeatedAlerts[0].isRead).toBe(false);
        expect(repeated.data.unreadCount).toBe(first.data.unreadCount);

        const markRead = await request.patch('/api/notifications', {
          data: { id: firstAlertId },
        });
        await expectSuccess(markRead, 200);

        const readResponse = await request.get('/api/notifications');
        const readPayload = await expectSuccess(readResponse, 200);
        const readAlert = (readPayload.data.notifications as LowStockNotification[]).find(
          (item) => item.id === firstAlertId
        );
        expect(readAlert?.isRead).toBe(true);
        expect(readPayload.data.unreadCount).toBe(repeated.data.unreadCount - 1);

        // Once stock returns above threshold, the acknowledged alert is resolved.
        const restock = await request.put(`/api/product/${productId}`, {
          data: { stock: 20 },
        });
        await expectSuccess(restock, 200);
        const recoveredResponse = await request.get('/api/notifications');
        const recovered = await expectSuccess(recoveredResponse, 200);
        expect((recovered.data.notifications as LowStockNotification[]).some(
          (item) => item.id === firstAlertId
        )).toBe(false);

        // Falling below the threshold again is a genuinely new event with a fresh unread ID.
        const lowerStock = await request.put(`/api/product/${productId}`, {
          data: { stock: 1 },
        });
        await expectSuccess(lowerStock, 200);
        const newAlertResponse = await request.get('/api/notifications');
        const newAlertPayload = await expectSuccess(newAlertResponse, 200);
        const newAlert = (newAlertPayload.data.notifications as LowStockNotification[]).find(
          (item) => item.productId === productId && item.active
        );
        expect(newAlert).toBeTruthy();
        expect(newAlert!.id).not.toBe(firstAlertId);
        expect(newAlert!.isRead).toBe(false);
        expect(newAlertPayload.data.unreadCount).toBe(recovered.data.unreadCount + 1);

        const markAllRead = await request.patch('/api/notifications', {
          data: { markAllRead: true },
        });
        await expectSuccess(markAllRead, 200);
      } finally {
        if (productId) {
          // Resolve the test event and acknowledge it so the shared test account is left clean.
          await request.delete(`/api/product/${productId}`).catch(() => {});
          const afterDelete = await request.get('/api/notifications').catch(() => null);
          if (afterDelete?.ok()) {
            const payload = await afterDelete.json().catch(() => null);
            const testNotifications = (payload?.data?.notifications || [])
              .filter((item: LowStockNotification) => item.productId === productId && !item.isRead);
            for (const notification of testNotifications) {
              await request.patch('/api/notifications', {
                data: { id: notification.id },
              }).catch(() => {});
            }
          }
        }
      }
    });
  });
});
