import { expect, test } from '@playwright/test';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { loadSeedData, ownerStorageStatePath } from '../fixtures/testData';
import { expectFailure, expectSuccess, withApiContext } from '../fixtures/api';

test.describe('Auth API', () => {
  test('rejects unauthorized profile requests', async () => {
    await withApiContext(undefined, async (request) => {
      const response = await request.get('/api/auth/me');
      await expectFailure(response, 401);
    });
  });

  test('supports email OTP signup, login, and password reset', async () => {
    const runId = loadSeedData().runId;
    const email = `otp-flow-${runId}-${Date.now()}@example.com`;
    const password = 'Password123!';

    await withApiContext(undefined, async (request) => {
      const signupOtpResponse = await request.post('/api/auth/send-otp', {
        data: { email, purpose: 'signup' },
      });
      const signupOtpPayload = await expectSuccess(signupOtpResponse, 200);
      const signupOtp = String(signupOtpPayload.data.developmentOtp || '');
      expect(signupOtp).toMatch(/^[0-9]{6}$/);

      const signup = await request.post('/api/auth/signup', {
        data: { name: 'OTP Flow Test', email, password, otp: signupOtp },
      });
      const signupPayload = await expectSuccess(signup, 201);
      expect(signupPayload.data.user).toMatchObject({ email: email.toLowerCase(), role: 'owner' });
      expect(signupPayload.data.sessionId).toBeUndefined();

      const signupCookie = signup.headers()['set-cookie'] || '';
      expect(signupCookie).toMatch(/Max-Age=2592000/i);
      expect(signupCookie).toMatch(/HttpOnly/i);
      const signupSessionId = signupCookie.match(/inventory_saas_token=([^;]+)/)?.[1];
      expect(signupSessionId).toBeTruthy();
      expect(signupSessionId!.split('.')).toHaveLength(1);
      expect(signupSessionId!.length).toBeGreaterThanOrEqual(40);

      const login = await request.post('/api/auth/login', {
        data: { email, password },
      });
      const loginPayload = await expectSuccess(login, 200);
      expect(loginPayload.data.user.email).toBe(email.toLowerCase());

      const forgot = await request.post('/api/auth/forgot-password', {
        data: { email },
      });
      const forgotPayload = await expectSuccess(forgot, 200);
      expect(forgotPayload.data.accepted).toBe(true);
      expect(forgotPayload.data.accountExists).toBe(true);
      const resetOtp = String(forgotPayload.data.developmentOtp || '');
      expect(resetOtp).toMatch(/^[0-9]{6}$/);

      const reset = await request.post('/api/auth/reset-password', {
        data: {
          email,
          otp: resetOtp,
          password: 'Password456!',
          confirmPassword: 'Password456!',
        },
      });
      await expectSuccess(reset, 200);

      // Password reset must revoke any previously issued session token.
      const oldSession = await request.get('/api/auth/me');
      await expectFailure(oldSession, 401);

      const relogin = await request.post('/api/auth/login', {
        data: { email, password: 'Password456!' },
      });
      await expectSuccess(relogin, 200);
      expect(relogin.headers()['set-cookie'] || '').toMatch(/Max-Age=2592000/i);

      const logout = await request.post('/api/auth/logout');
      await expectSuccess(logout, 200);
      const afterLogout = await request.get('/api/auth/me');
      await expectFailure(afterLogout, 401);
    });
  });



  test('rejects cross-origin state-changing requests with an authenticated session', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const response = await request.post('/api/category', {
        headers: { Origin: 'https://attacker.example' },
        data: { name: `Cross-origin category ${Date.now()}` },
      });
      const payload = await expectFailure(response, 403);
      expect(String(payload.message)).toMatch(/cross-origin/i);
    });
  });

  test('demo login can read its workspace but cannot mutate it through the API', async () => {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required for the isolated demo-account security test.');
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const email = `readonly-demo-${Date.now()}@example.com`;
    const password = 'DemoReadOnly123!';
    const now = new Date();
    const inserted = await db.collection('users').insertOne({
      name: 'Read-only Demo Test',
      email,
      emailVerified: true,
      phone: '',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'owner',
      isActive: true,
      isDemo: true,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await withApiContext(undefined, async (request) => {
        const login = await request.post('/api/auth/login', { data: { email, password } });
        await expectSuccess(login, 200);

        const read = await request.get('/api/product?limit=1');
        await expectSuccess(read, 200);

        const write = await request.post('/api/category', {
          data: { name: `Blocked Demo Category ${Date.now()}` },
        });
        const failure = await expectFailure(write, 403);
        expect(String(failure.message)).toMatch(/read-only/i);
      });
    } finally {
      await db.collection('users').deleteOne({ _id: inserted.insertedId });
      await client.close();
    }
  });

  test('identifies unknown recovery emails and limits requests to five per window', async () => {
    const email = `unknown-recovery-${Date.now()}@example.com`;

    await withApiContext(undefined, async (request) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await request.post('/api/auth/forgot-password', {
          data: { email },
        });
        const payload = await expectSuccess(response, 200);
        expect(payload.data.accountExists).toBe(false);
        expect(payload.data.developmentOtp).toBeUndefined();
      }

      const sixthAttempt = await request.post('/api/auth/forgot-password', {
        data: { email },
      });
      await expectFailure(sixthAttempt, 429);
    });
  });

  test('returns validation failures for malformed reset payloads', async () => {
    await withApiContext(undefined, async (request) => {
      const response = await request.post('/api/auth/reset-password', {
        data: {
          token: 'short',
          password: '123',
          confirmPassword: '456',
        },
      });

      const payload = await expectFailure(response, 400);
      expect(String(payload.message)).toMatch(/validation/i);
    });
  });

  test('does not allow public signup to assign the staff role', async () => {
    const runId = loadSeedData().runId;

    await withApiContext(undefined, async (request) => {
      const email = `role-boundary-${runId}-${Date.now()}@example.com`;
      const otpResponse = await request.post('/api/auth/send-otp', {
        data: { email, purpose: 'signup' },
      });
      const otpPayload = await expectSuccess(otpResponse, 200);
      const otp = String(otpPayload.data.developmentOtp || '');
      expect(otp).toMatch(/^[0-9]{6}$/);

      const response = await request.post('/api/auth/signup', {
        data: {
          name: 'Role Boundary Test',
          email,
          password: 'Password123!',
          otp,
          role: 'staff',
        },
      });

      const payload = await expectSuccess(response, 201);
      expect(payload.data.user.role).toBe('owner');
    });
  });

  test('reports duplicate signup attempts', async () => {
    const seed = loadSeedData();

    await withApiContext(undefined, async (request) => {
      const response = await request.post('/api/auth/send-otp', {
        data: {
          email: seed.users.owner.email,
          purpose: 'signup',
        },
      });

      const payload = await expectFailure(response, 409);
      expect(String(payload.message)).toMatch(/already registered/i);
    });
  });

  test('persists only one unread low-stock alert per stock shortage and starts a fresh event after recovery', async () => {
    const seed = loadSeedData();
    const unique = Date.now();
    let productId: string | null = null;

    await withApiContext(ownerStorageStatePath, async (request) => {
      try {
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
        expect(first.data.notifications.every((item: any) =>
          item.kind === 'Low stock' || item.kind === 'Out of stock'
        )).toBe(true);
        const firstAlert = first.data.notifications.find(
          (item: any) => item.productId === productId && item.active
        );
        expect(firstAlert).toBeTruthy();
        expect(firstAlert.isRead).toBe(false);
        expect(firstAlert.kind).toBe('Low stock');
        const firstAlertId = firstAlert.id;

        // Repeated polling while stock stays low must not produce another event.
        const repeatedResponse = await request.get('/api/notifications');
        const repeated = await expectSuccess(repeatedResponse, 200);
        const repeatedAlerts = repeated.data.notifications.filter(
          (item: any) => item.productId === productId && item.active
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
        const readAlert = readPayload.data.notifications.find((item: any) => item.id === firstAlertId);
        expect(readAlert?.isRead).toBe(true);
        expect(readPayload.data.unreadCount).toBe(repeated.data.unreadCount - 1);

        const restock = await request.put(`/api/product/${productId}`, { data: { stock: 20 } });
        await expectSuccess(restock, 200);
        const recoveredResponse = await request.get('/api/notifications');
        const recovered = await expectSuccess(recoveredResponse, 200);
        expect(recovered.data.notifications.some((item: any) => item.id === firstAlertId)).toBe(false);

        // A fresh drop below the threshold creates a new unread notification ID.
        const lowerStock = await request.put(`/api/product/${productId}`, { data: { stock: 1 } });
        await expectSuccess(lowerStock, 200);
        const newAlertResponse = await request.get('/api/notifications');
        const newAlertPayload = await expectSuccess(newAlertResponse, 200);
        const newAlert = newAlertPayload.data.notifications.find(
          (item: any) => item.productId === productId && item.active
        );
        expect(newAlert).toBeTruthy();
        expect(newAlert.id).not.toBe(firstAlertId);
        expect(newAlert.isRead).toBe(false);
        expect(newAlertPayload.data.unreadCount).toBe(recovered.data.unreadCount + 1);

        await expectSuccess(await request.patch('/api/notifications', {
          data: { id: newAlert.id },
        }), 200);
      } finally {
        if (productId) {
          await request.delete(`/api/product/${productId}`).catch(() => {});
          const afterDelete = await request.get('/api/notifications').catch(() => null);
          if (afterDelete?.ok()) {
            const payload = await afterDelete.json().catch(() => null);
            const testNotifications = (payload?.data?.notifications || [])
              .filter((item: any) => item.productId === productId && !item.isRead);
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
