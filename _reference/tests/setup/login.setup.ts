// Runs once per target before the tests (setup project): logs in and creates the run's test space.
// The space is created here, not per worker, because Confluence 9.2 fails (HTTP 500,
// duplicate key "bandana_unique_key") when two spaces are created at the same moment on a
// freshly started instance (docs/notes/hosts.md).
import { mkdirSync, writeFileSync } from 'node:fs';
import { test, spaceFile } from '../fixtures/index.js';

test('log in as administrator', async ({ page, adapter, creds, targetName }) => {
  await adapter.login(page, creds.username, creds.password);
  mkdirSync('.auth', { recursive: true });
  await page.context().storageState({ path: `.auth/${targetName}.json` });
});

test('create test space', async ({ rest, targetName }) => {
  // Space keys: letters and digits only. Unique per run.
  const key = `GM${Date.now().toString(36).toUpperCase()}`;
  await rest.createSpace(key, `Google Maps tests ${key}`);
  mkdirSync('.auth', { recursive: true });
  writeFileSync(spaceFile(targetName), JSON.stringify({ key }));
});
