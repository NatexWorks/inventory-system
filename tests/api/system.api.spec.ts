import { expect, test } from '@playwright/test';
import { ownerStorageStatePath, staffStorageStatePath } from '../fixtures/testData';
import { expectFailure, expectSuccess, withApiContext } from '../fixtures/api';

test.describe('System API', () => {
  test('exposes the public fake-order endpoint', async () => {
    await withApiContext(undefined, async (request) => {
      const response = await request.post('/api/fake-order');
      const payload = await expectSuccess(response, 200);
      expect(payload.order.status).toBe('created');
    });
  });

  test('enforces owner-only session creation and supports lifecycle updates', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const create = await request.post('/api/sessions', {
        data: { name: 'QA Billing Session', deviceId: 'DEVICE-001' },
      });
      const created = await expectSuccess(create, 200);
      expect(created.data.session.status).toBe('ACTIVE');

      const sessionId = created.data.session.sessionId as string;

      const list = await request.get('/api/sessions');
      const listed = await expectSuccess(list, 200);
      expect(Array.isArray(listed.data.sessions)).toBe(true);

      const fetchSession = await request.get(`/api/sessions/${sessionId}`);
      const fetched = await expectSuccess(fetchSession, 200);
      expect(fetched.data.session.sessionId).toBe(sessionId);

      const join = await request.patch(`/api/sessions/${sessionId}`, {
        data: { action: 'join', deviceId: 'DEVICE-002' },
      });
      await expectSuccess(join, 200);

      const complete = await request.patch(`/api/sessions/${sessionId}`, {
        data: { action: 'complete' },
      });
      const completed = await expectSuccess(complete, 200);
      expect(completed.data.session.status).toBe('COMPLETED');
    });

    await withApiContext(staffStorageStatePath, async (request) => {
      const response = await request.post('/api/sessions', {
        data: { name: 'Staff attempt' },
      });
      await expectFailure(response, 403);
    });
  });

  test('updates settings through the API with schema validation', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const response = await request.put('/api/settings', {
        data: {
          inventory: {
            lowStockThreshold: 3,
            barcodeRules: 'Test rule',
            autoBarcodeGeneration: true,
          },
          billing: {
            invoiceEnabled: true,
            taxPercentage: 18,
            invoiceFormat: 'thermal',
          },
          system: {
            offlineMode: false,
            sessionTimeoutMinutes: 45,
          },
        },
      });
      const payload = await expectSuccess(response, 200);
      expect(payload.data.settings.billing.invoiceFormat).toBe('thermal');
    });
  });
});
