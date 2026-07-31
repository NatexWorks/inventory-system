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
      expect(forgotPayload.data.resetLink).toContain('/reset-password?token=');

      const token = new URL(forgotPayload.data.resetLink as string).searchParams.get('token') || '';
      const reset = await request.post('/api/auth/reset-password', {
        data: {
          token,
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

  test('reports duplicate signup attempts', async () => {
    const seed = loadSeedData();

    await withApiContext(undefined, async (request) => {
      const response = await request.post('/api/auth/signup', {
        data: {
          name: seed.users.owner.name,
          email: seed.users.owner.email,
          password: seed.users.owner.password,
          role: 'owner',
        },
      });

      const payload = await expectFailure(response, 500);
      expect(String(payload.message)).toMatch(/already registered/i);
    });
  });
});
