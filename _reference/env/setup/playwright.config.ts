// Environment setup only (first-time setup wizard). Not part of the test suite.
// Run through env/atl-env.sh <profile> setup, which passes the ATL_* variables.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.setup\.ts/,
  // The database creation step of the wizard can take several minutes.
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: 0,
  outputDir: './test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]],
  use: {
    baseURL: process.env.ATL_BASE_URL,
    // Long waits (database creation) set their own timeout; everything else fails fast.
    actionTimeout: 60_000,
    navigationTimeout: 120_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    locale: 'en-US',
  },
});
