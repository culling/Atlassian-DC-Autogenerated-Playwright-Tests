// Runs once per target after all tests (teardown project): deletes the run's test space.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { test, spaceFile } from '../fixtures/index.js';

test('delete test space', async ({ rest, targetName }) => {
  const file = spaceFile(targetName);
  if (!existsSync(file)) return;
  const { key } = JSON.parse(readFileSync(file, 'utf8')) as { key: string };
  await rest.deleteSpace(key);
  rmSync(file);
});
