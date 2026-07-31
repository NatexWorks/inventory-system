import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const authDir = path.join(process.cwd(), 'tests', '.auth');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }],['json' ,{outputFile:'firstReport.json'}]],
  globalSetup: './tests/global.setup.ts',
  globalTeardown: './tests/global.teardown.ts',
  use: {
    baseURL,
    // retain-on-failure
    trace: 'retain-on-failure',
    permissions:['camera'],
    // only-on-failure
    screenshot: 'only-on-failure',
    // retain-on-failure
    video: 'retain-on-failure',
    // launchOptions:{
    //   slowMo:2000,
    // },
    storageState: path.join(authDir, 'owner.storage.json'),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
