import { test as base, expect, type PlaywrightWorkerArgs } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createAdapter, type AdapterName, type HostAdapter } from '../adapters/index.js';
import { ConfluenceRest, credentialsFromEnv, type Credentials } from './rest.js';

export const APP_KEY = 'org.techtime.confluence.plugins.googlemapsembed';

/** Per-project options, set in playwright.config.ts from tests/targets.ts. */
export interface SuiteOptions {
  adapterName: AdapterName;
  targetName: string;
  hostVersion: string;
  /** Same value as baseURL; worker-scoped so worker fixtures (test space) can use it. */
  hostBaseURL: string;
}

interface TestFixtures {
  adapter: HostAdapter;
  creds: Credentials;
  rest: ConfluenceRest;
  /** Id of a new, empty page in the worker's test space (created by REST: setup only). */
  emptyPageId: string;
  /** Collects browser console errors and attaches them, plus the product log tail, on failure. */
  failureEvidence: void;
}

interface WorkerFixtures {
  /** Key of the run's test space (created by the setup project, deleted by the teardown project). */
  spaceKey: string;
}

/** Product log for failure evidence. ATL_LOG_FILE overrides the default local path. */
function productLogPath(targetName: string): string {
  return process.env.ATL_LOG_FILE ?? `env/instances/${targetName}/home/logs/atlassian-confluence.log`;
}

function lastLines(file: string, n: number): string {
  return readFileSync(file, 'utf8').split('\n').slice(-n).join('\n');
}

/**
 * Request context for REST setup calls, without the browser's session cookie.
 * Inside Playwright Test, newContext() inherits the project's storageState, so it is cleared here.
 * Reason: on Confluence 9.2, a Basic-auth call that also sends the browser's JSESSIONID makes the
 * server issue a new session, and the browser is then redirected to login (verified in a trace).
 */
function restContext(playwright: PlaywrightWorkerArgs['playwright'], baseURL: string) {
  return playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
}

/** File holding the key of the run's test space for a target. */
export function spaceFile(targetName: string): string {
  return `.auth/${targetName}.space.json`;
}

export const test = base.extend<TestFixtures & Pick<SuiteOptions, 'adapterName' | 'hostVersion'>,
  WorkerFixtures & Pick<SuiteOptions, 'hostBaseURL' | 'targetName'>>({
  adapterName: ['confluence-8', { option: true }],
  targetName: ['', { option: true, scope: 'worker' }],
  hostVersion: ['', { option: true }],
  hostBaseURL: ['', { option: true, scope: 'worker' }],

  spaceKey: [
    async ({ targetName }, use) => {
      // Created by tests/setup/login.setup.ts, deleted by tests/setup/cleanup.teardown.ts.
      const file = spaceFile(targetName);
      if (!existsSync(file)) throw new Error(`${file} not found: the setup project "setup-${targetName}" must run first`);
      await use((JSON.parse(readFileSync(file, 'utf8')) as { key: string }).key);
    },
    { scope: 'worker' },
  ],

  adapter: async ({ adapterName }, use) => {
    await use(createAdapter(adapterName));
  },

  creds: async ({}, use) => {
    await use(credentialsFromEnv());
  },

  rest: async ({ playwright, hostBaseURL, creds }, use) => {
    const request = await restContext(playwright, hostBaseURL);
    await use(new ConfluenceRest(request, creds));
    await request.dispose();
  },

  emptyPageId: async ({ rest, spaceKey }, use, testInfo) => {
    // Titles must be unique in the shared space, also for parallel workers and --repeat-each.
    const unique = `w${testInfo.workerIndex}r${testInfo.repeatEachIndex} ${randomUUID().slice(0, 8)}`;
    const title = `${testInfo.title.replace(/[^\w ]/g, '').slice(0, 60)} ${unique}`;
    await use(await rest.createPage(spaceKey, title));
  },

  failureEvidence: [
    async ({ page, targetName, hostVersion, rest }, use, testInfo) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`${msg.location().url}: ${msg.text()}`);
      });
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

      await use();

      if (testInfo.status === testInfo.expectedStatus) return;
      const appVersion = await rest.appVersion(APP_KEY).catch((e) => `unknown (${e})`);
      await testInfo.attach('host-and-app.txt', {
        body: `target: ${targetName}\nhost version: ${hostVersion}\napp ${APP_KEY}: ${appVersion}\n`,
        contentType: 'text/plain',
      });
      await testInfo.attach('browser-console-errors.txt', {
        body: consoleErrors.join('\n') || '(none)',
        contentType: 'text/plain',
      });
      const log = productLogPath(targetName);
      await testInfo.attach('product-log-last-200-lines.txt', {
        body: existsSync(log) ? lastLines(log, 200) : `(log file not found: ${log})`,
        contentType: 'text/plain',
      });
    },
    { auto: true },
  ],
});

export { expect };
