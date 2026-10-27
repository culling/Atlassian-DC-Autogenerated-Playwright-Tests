// Host instances the test suite runs against. One Playwright project per entry.
//
// The tests only need a base URL and credentials. They do not depend on how the
// environment was created (env/atl-env.sh locally, or anything else in CI).
// Override a base URL with the environment variable named in `baseURLEnv`.
import type { AdapterName } from './adapters/index.js';

export interface Target {
  /** Project name; matches the profile name in env/profiles/ when env/atl-env.sh is used. */
  name: string;
  product: 'confluence';
  version: string;
  adapter: AdapterName;
  baseURLEnv: string;
  defaultBaseURL: string;
  /** Tests tagged for other hosts only, filtered out for this target. */
  grepInvert?: RegExp;
}

export const targets: Target[] = [
  {
    name: 'confluence-8.5.31',
    product: 'confluence',
    version: '8.5.31',
    adapter: 'confluence-8',
    baseURLEnv: 'ATL_BASE_URL_CONFLUENCE_8_5_31',
    // 127.0.0.1, not localhost: ::1 is held by wslrelay and never answers (docs/notes/hosts.md).
    defaultBaseURL: 'http://127.0.0.1:8090',
    grepInvert: /@confluence-6-only/,
  },
  {
    name: 'confluence-9.2.26',
    product: 'confluence',
    version: '9.2.26',
    adapter: 'confluence-9',
    baseURLEnv: 'ATL_BASE_URL_CONFLUENCE_9_2_26',
    defaultBaseURL: 'http://127.0.0.1:8100',
    grepInvert: /@confluence-6-only/,
  },
];

/** Base URL with a trailing slash, so relative paths keep a context path such as /confluence. */
export function baseURLOf(t: Target): string {
  const url = process.env[t.baseURLEnv] ?? t.defaultBaseURL;
  return url.endsWith('/') ? url : url + '/';
}
