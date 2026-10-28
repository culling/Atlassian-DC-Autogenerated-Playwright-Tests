import { test as base, expect, type Page, type PlaywrightWorkerArgs } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createAdapter, type AdapterName, type HostAdapter } from '../adapters/index.js';
import { createRest, credentialsFromEnv, type Credentials, type HostRest, type Product } from './rest.js';

/** Per-project options, set in playwright.config.ts from tests/targets.ts. */
export interface SuiteOptions {
  adapterName: AdapterName;
  targetName: string;
  product: Product;
  /** Key of the app under test (from tests/targets.ts). */
  appKey: string;
  hostVersion: string;
  /** Same value as baseURL; worker-scoped so worker-scoped fixtures can use it. */
  hostBaseURL: string;
}

interface TestFixtures {
  adapter: HostAdapter;
  creds: Credentials;
  rest: HostRest;
  /** A new non-admin user for this test (created by REST: setup only; removed afterwards). */
  testUser: Credentials;
  /** Removes all EasySSO header rules before and after the test (REST: setup and teardown only). */
  cleanEasySsoHeaderRules: void;
  /**
   * Opens a page in a new browser context that has no login cookie, and sends `headers` with every
   * request. This is how a request from behind an authenticating reverse proxy looks to the host.
   */
  newAnonymousPage: (headers?: Record<string, string>) => Promise<Page>;
  /** Collects browser console errors and attaches them, plus the product log tail, on failure. */
  failureEvidence: void;
}

/**
 * Product log for failure evidence. ATL_LOG_FILE overrides the default local path
 * (where env/atl-env.sh mounts the log directory of the home dir).
 */
function productLogPath(targetName: string, product: Product): string {
  const local = product === 'jira' ? 'log/atlassian-jira.log' : 'logs/atlassian-confluence.log';
  return process.env.ATL_LOG_FILE ?? `env/instances/${targetName}/home/${local}`;
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

export const test = base.extend<TestFixtures & Pick<SuiteOptions, 'adapterName' | 'hostVersion' | 'appKey'>,
  Pick<SuiteOptions, 'hostBaseURL' | 'targetName' | 'product'>>({
  adapterName: ['confluence-6', { option: true }],
  targetName: ['', { option: true, scope: 'worker' }],
  hostVersion: ['', { option: true }],
  appKey: ['', { option: true }],
  product: ['confluence', { option: true, scope: 'worker' }],
  hostBaseURL: ['', { option: true, scope: 'worker' }],

  adapter: async ({ adapterName }, use) => {
    await use(createAdapter(adapterName));
  },

  creds: async ({}, use) => {
    await use(credentialsFromEnv());
  },

  rest: async ({ playwright, hostBaseURL, product, creds }, use) => {
    const request = await restContext(playwright, hostBaseURL);
    await use(createRest(product, request, creds));
    await request.dispose();
  },

  testUser: async ({ rest }, use, testInfo) => {
    // Unique per test run and repeat, so parallel workers and --repeat-each never share a user.
    const username = `sso-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`;
    const password = randomUUID();
    await rest.createUser(username, `SSO Test User ${username}`, password);
    await use({ username, password });
    await rest.removeUser(username);
  },

  cleanEasySsoHeaderRules: async ({ rest }, use) => {
    await rest.clearEasySsoHeaderRules();
    await use();
    await rest.clearEasySsoHeaderRules();
  },

  newAnonymousPage: async ({ browser, baseURL }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (headers = {}) => {
      // storageState is cleared explicitly so the project's saved admin login is not used.
      const context = await browser.newContext({
        baseURL,
        locale: 'en-US',
        storageState: { cookies: [], origins: [] },
        extraHTTPHeaders: { 'Accept-Language': 'en-US', ...headers },
      });
      contexts.push(context);
      return context.newPage();
    });
    for (const c of contexts) await c.close();
  },

  failureEvidence: [
    async ({ page, targetName, hostVersion, product, appKey, rest }, use, testInfo) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`${msg.location().url}: ${msg.text()}`);
      });
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

      await use();

      if (testInfo.status === testInfo.expectedStatus) return;
      const appVersion = await rest.appVersion(appKey).catch((e) => `unknown (${e})`);
      await testInfo.attach('host-and-app.txt', {
        body: `target: ${targetName}\nhost version: ${hostVersion}\napp ${appKey}: ${appVersion}\n`,
        contentType: 'text/plain',
      });
      await testInfo.attach('browser-console-errors.txt', {
        body: consoleErrors.join('\n') || '(none)',
        contentType: 'text/plain',
      });
      const log = productLogPath(targetName, product);
      await testInfo.attach('product-log-last-200-lines.txt', {
        body: existsSync(log) ? lastLines(log, 200) : `(log file not found: ${log})`,
        contentType: 'text/plain',
      });
    },
    { auto: true },
  ],
});

export { expect };
