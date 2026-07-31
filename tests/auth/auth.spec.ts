import { expect, test } from '@playwright/test';
import { getTestUsers, loadSeedData } from '../fixtures/testData';
import { AuthPage } from '../page-objects/AuthPage';

test.use({ storageState: undefined });

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
    await auth.signup(`New Owner ${runId}`, email, 'Password123!', 'owner');

    await expect(page).toHaveURL(/\/$/);
    await auth.expectHeading(/Welcome back/i);
  });

  test('opens protected pages after logging in', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /Products List/i })).toBeVisible();
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
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/reset link generated|if the email exists/i)).toBeVisible();

    await auth.goto('/reset-password');
    await expect(page.getByText(/missing reset token/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset password/i })).toBeDisabled();
  });
});
