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


  test('does not allow account email changes through Settings', async () => {
    await withApiContext(ownerStorageStatePath, async (request) => {
      const meResponse = await request.get('/api/auth/me');
      const mePayload = await expectSuccess(meResponse, 200);
      const originalEmail = mePayload.data.user.email;

      const response = await request.put('/api/settings/profile', {
        data: {
          name: mePayload.data.user.name,
          email: `changed-${Date.now()}@example.com`,
          phone: mePayload.data.user.phone || '',
        },
      });
      const payload = await expectFailure(response, 400);
      expect(String(payload.message)).toMatch(/email cannot be changed/i);

      const afterResponse = await request.get('/api/auth/me');
      const afterPayload = await expectSuccess(afterResponse, 200);
      expect(afterPayload.data.user.email).toBe(originalEmail);
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
});
