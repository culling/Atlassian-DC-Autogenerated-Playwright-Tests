// Host instances the test suite runs against. One Playwright project per entry.
//
// The tests only need a base URL and credentials. They do not depend on how the
// environment was created (env/atl-env.sh locally, or anything else in CI).
// Override a base URL with the environment variable named in `baseURLEnv`.
import type { AdapterName } from './adapters/index.js';
import type { Product } from './fixtures/rest.js';

export interface Target {
  /** Project name; matches the profile name in env/profiles/ when env/atl-env.sh is used. */
  name: string;
  product: Product;
  /** Key of the app under test on this host (failure evidence reads its version from UPM). */
  appKey: string;
  version: string;
  adapter: AdapterName;
  baseURLEnv: string;
  defaultBaseURL: string;
  /** Tests tagged for other hosts only, filtered out for this target. */
  grepInvert?: RegExp;
}

export const targets: Target[] = [
  {
    name: 'confluence-6.6.17',
    product: 'confluence',
    appKey: 'org.techtime.confluence.plugins.easysso',
    version: '6.6.17',
    adapter: 'confluence-6',
    baseURLEnv: 'ATL_BASE_URL_CONFLUENCE_6_6_17',
    // 127.0.0.1, not localhost: ::1 is held by wslrelay and never answers (docs/notes/hosts.md).
    defaultBaseURL: 'http://127.0.0.1:8066',
  },
  {
    name: 'confluence-9.5.4',
    product: 'confluence',
    appKey: 'org.techtime.confluence.plugins.easysso',
    version: '9.5.4',
    adapter: 'confluence-9',
    baseURLEnv: 'ATL_BASE_URL_CONFLUENCE_9_5_4',
    defaultBaseURL: 'http://127.0.0.1:8095',
  },
  {
    name: 'jira-8.22.1',
    product: 'jira',
    appKey: 'org.techtime.jira.plugins.easysso',
    version: '8.22.1',
    adapter: 'jira',
    baseURLEnv: 'ATL_BASE_URL_JIRA_8_22_1',
    defaultBaseURL: 'http://127.0.0.1:8822',
  },
  {
    name: 'jira-10.7.4',
    product: 'jira',
    appKey: 'org.techtime.jira.plugins.easysso',
    version: '10.7.4',
    adapter: 'jira-10',
    baseURLEnv: 'ATL_BASE_URL_JIRA_10_7_4',
    defaultBaseURL: 'http://127.0.0.1:8107',
  },
];

/** Base URL with a trailing slash, so relative paths keep a context path such as /confluence. */
export function baseURLOf(t: Target): string {
  const url = process.env[t.baseURLEnv] ?? t.defaultBaseURL;
  return url.endsWith('/') ? url : url + '/';
}
