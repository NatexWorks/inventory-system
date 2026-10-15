import { expect, test } from '@playwright/test';
import { getTestUsers, loadSeedData } from '../fixtures/testData';
import { AuthPage } from '../page-objects/AuthPage';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('logs in, reaches the dashboard, and logs out', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);

    await expect(page).toHaveURL(/\/$/);
    await auth.expectHeading(/Welcome back/i);

    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('signs up a fresh workspace user', async ({ page }) => {
    const auth = new AuthPage(page);
    const runId = loadSeedData().runId;
    const email = `new-owner-${runId}-${Date.now()}@example.com`;

    await auth.goto('/signup');
    await auth.signup(`New Owner ${runId}`, email, 'Password123!');

    await expect(page).toHaveURL(/\/$/);
    await auth.expectHeading(/Welcome back/i);
  });

  test('redirects unauthenticated visitors to login and remembers the requested page', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('opens protected pages after logging in', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /Products List/i })).toBeVisible();
  });

  test('shows the read-only demo credentials on login and signup pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Try the demo account')).toBeVisible();
    await expect(page.getByText('demo@inventory-system.test', { exact: true })).toBeVisible();
    await expect(page.getByText('Demo@12345', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /fill demo credentials/i }).click();
    await expect(page.getByLabel('Email')).toHaveValue('demo@inventory-system.test');
    await expect(page.getByLabel('Password')).toHaveValue('Demo@12345');

    await page.goto('/signup');
    await expect(page.getByText('Try the demo account')).toBeVisible();
    await expect(page.getByText('demo@inventory-system.test', { exact: true })).toBeVisible();
    await expect(page.getByText('Demo@12345', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /open demo login/i })).toBeVisible();
  });

  test('shows maintenance screen instead of API server error details', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Set OTP_SECRET or JWT_SECRET to a random secret',
          errors: ['Internal database diagnostic'],
        }),
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Site Under Maintenance/i })).toBeVisible();
    await expect(page.getByText(/Set OTP_SECRET|Internal database diagnostic/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible();
  });

  test('shows validation and recovery flows', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await page.getByLabel('Email').fill(users.owner.email);
    await page.getByLabel('Password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /^login$/i }).click();
    await auth.expectError(/invalid credentials|email/i);

    await auth.goto('/forgot-password');
    await page.getByLabel('Email').fill('missing-user@example.com');
    await page.getByRole('button', { name: /send reset code/i }).click();
    await expect(page).toHaveURL(/\/signup\?email=.*notice=account-not-found/);
    await expect(page.getByLabel('Email')).toHaveValue('missing-user@example.com');
    await expect(page.getByText(/No account was found for this email/i)).toBeVisible();
  });
});
