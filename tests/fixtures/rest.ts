// REST helpers for test setup and teardown ONLY (CLAUDE.md section 6.4).
// Never call these from inside a test body to perform or check the behaviour under test.
import type { APIRequestContext } from '@playwright/test';

export interface Credentials {
  username: string;
  password: string;
}

export function credentialsFromEnv(): Credentials {
  const username = process.env.ATL_ADMIN_USER;
  const password = process.env.ATL_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('ATL_ADMIN_USER and ATL_ADMIN_PASSWORD must be set (see .env.local.example)');
  }
  return { username, password };
}

function authHeader(c: Credentials): Record<string, string> {
  return {
    Authorization: 'Basic ' + Buffer.from(`${c.username}:${c.password}`).toString('base64'),
    'X-Atlassian-Token': 'no-check',
  };
}

async function check(res: Awaited<ReturnType<APIRequestContext['get']>>, what: string): Promise<void> {
  if (!res.ok()) throw new Error(`${what} failed: HTTP ${res.status()} ${await res.text()}`);
}

export class ConfluenceRest {
  constructor(private readonly request: APIRequestContext, private readonly creds: Credentials) {}

  /**
   * Creates a user with the JSON-RPC remote API. Confluence 6.6 has no REST endpoint for creating users
   * (verified on 6.6.17: addUser answers HTTP 200 and the user then exists in /rest/api/user). Also works on 9.5.4.
   */
  async createUser(username: string, fullName: string, password: string): Promise<void> {
    const res = await this.request.post('rpc/json-rpc/confluenceservice-v2/addUser', {
      headers: authHeader(this.creds),
      data: [{ name: username, fullname: fullName, email: `${username}@example.com` }, password],
    });
    await check(res, `create user ${username}`);
    // JSON-RPC reports errors with HTTP 200 and an "error" member.
    const body = await res.text();
    if (body.includes('"error"')) throw new Error(`create user ${username} failed: ${body}`);
  }

  async removeUser(username: string): Promise<void> {
    const res = await this.request.post('rpc/json-rpc/confluenceservice-v2/removeUser', {
      headers: authHeader(this.creds),
      data: [username],
    });
    await check(res, `remove user ${username}`);
  }

  /** Removes every EasySSO custom authentication (header) rule. Same endpoint the app's admin page saves to. */
  async clearEasySsoHeaderRules(): Promise<void> {
    const res = await this.request.put('rest/easysso/1.0/headers', { headers: authHeader(this.creds), data: [] });
    await check(res, 'clear EasySSO header rules');
  }

  /** Reads the installed version of an app from UPM. Used only for failure evidence. */
  async appVersion(appKey: string): Promise<string> {
    const res = await this.request.get(`rest/plugins/1.0/${appKey}-key`, { headers: authHeader(this.creds) });
    if (!res.ok()) return `unknown (HTTP ${res.status()})`;
    return String((await res.json()).version ?? 'unknown');
  }
}
