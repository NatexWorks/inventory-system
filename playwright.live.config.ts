import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://inventory-system-mu-puce.vercel.app';

export default defineConfig({
  testDir: './tests/live',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-live-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // This suite intentionally targets the deployed website. It does not seed data,
  // log in with production credentials, or mutate inventory records.
});
