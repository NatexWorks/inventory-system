import { expect, test } from '@playwright/test';
import { getTestUsers, loadSeedData } from '../fixtures/testData';
import { expectFailure, expectSuccess, withApiContext } from '../fixtures/api';

test.describe('Auth API', () => {
  test('rejects unauthorized profile requests', async () => {
    await withApiContext(undefined, async (request) => {
      const response = await request.get('/api/auth/me');
      await expectFailure(response, 401);
    });
  });

  test('supports login, forgot password, and reset flows', async () => {
    const users = getTestUsers();

    await withApiContext(undefined, async (request) => {
      const login = await request.post('/api/auth/login', {
        data: { email: users.owner.email, password: users.owner.password },
      });
      const loginPayload = await expectSuccess(login, 200);
      expect(loginPayload.data).toMatchObject({
        user: {
          email: users.owner.email,
          role: 'owner',
        },
      });

      const forgot = await request.post('/api/auth/forgot-password', {
        data: { email: users.owner.email },
      });
      const forgotPayload = await expectSuccess(forgot, 200);
      expect(forgotPayload.data.accepted).toBe(true);
      const otp = String(forgotPayload.data.developmentOtp || '');
      expect(otp).toMatch(/^[0-9]{6}$/);

      const reset = await request.post('/api/auth/reset-password', {
        data: {
          email: users.owner.email,
          otp,
          password: 'Password456!',
          confirmPassword: 'Password456!',
        },
      });
      await expectSuccess(reset, 200);

      const relogin = await request.post('/api/auth/login', {
        data: { email: users.owner.email, password: 'Password456!' },
      });
      await expectSuccess(relogin, 200);
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
});
