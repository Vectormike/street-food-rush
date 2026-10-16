import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'lagoslife-auth',
      testMatch: 'lagoslife-auth.setup.ts',
    },
    {
      name: 'upload-listing',
      testMatch: 'upload-listing.spec.ts',
      use: {
        storageState: 'e2e/.auth/lagoslife.json',
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'vatar-sandbox',
      testMatch: 'sandbox-purchase.spec.ts',
      dependencies: ['lagoslife-auth'],
      use: {
        storageState: 'e2e/.auth/lagoslife.json',
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'mobile',
      testIgnore: ['**/lagoslife-auth.setup.ts', '**/sandbox-purchase.spec.ts', '**/upload-listing.spec.ts'],
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      testIgnore: ['**/lagoslife-auth.setup.ts', '**/sandbox-purchase.spec.ts', '**/upload-listing.spec.ts'],
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
