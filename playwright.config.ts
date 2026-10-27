// Test suite config. The environment setup wizard has its own config: env/setup/playwright.config.ts
import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { targets, baseURLOf } from './tests/targets.js';
import type { SuiteOptions } from './tests/fixtures/index.js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig<SuiteOptions>({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One worker: the EasySSO settings the tests change (header rules) are site-wide, so two tests that
  // change them at the same time would break each other.
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US' },
  },
  projects: targets.flatMap((t) => [
    {
      name: `setup-${t.name}`,
      testMatch: /setup[\\/].*\.setup\.ts/,
      use: { baseURL: baseURLOf(t), hostBaseURL: baseURLOf(t), adapterName: t.adapter, targetName: t.name, hostVersion: t.version },
    },
    {
      name: t.name,
      testMatch: /specs[\\/].*\.spec\.ts/,
      dependencies: [`setup-${t.name}`],
      grepInvert: t.grepInvert,
      use: {
        baseURL: baseURLOf(t),
        hostBaseURL: baseURLOf(t),
        adapterName: t.adapter,
        targetName: t.name,
        hostVersion: t.version,
        storageState: `.auth/${t.name}.json`,
      },
    },
  ]),
});
