// Runs once per target before the tests (setup project): logs in as administrator and saves the login state.
import { mkdirSync } from 'node:fs';
import { test } from '../fixtures/index.js';

test('log in as administrator', async ({ page, adapter, creds, targetName }) => {
  await adapter.login(page, creds.username, creds.password);
  mkdirSync('.auth', { recursive: true });
  await page.context().storageState({ path: `.auth/${targetName}.json` });
});
