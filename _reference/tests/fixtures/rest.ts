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

  async createSpace(key: string, name: string): Promise<void> {
    const res = await this.request.post('rest/api/space', {
      headers: authHeader(this.creds),
      data: { key, name },
    });
    await check(res, `create space ${key}`);
  }

  async deleteSpace(key: string): Promise<void> {
    const res = await this.request.delete(`rest/api/space/${key}`, { headers: authHeader(this.creds) });
    // 202 = deletion queued; 404 = already gone. Both are fine for teardown.
    if (res.status() !== 404) await check(res, `delete space ${key}`);
  }

  /** Creates a page and returns its id. `storageBody` is Confluence storage format (XHTML). */
  async createPage(spaceKey: string, title: string, storageBody = ''): Promise<string> {
    const res = await this.request.post('rest/api/content', {
      headers: authHeader(this.creds),
      data: {
        type: 'page',
        title,
        space: { key: spaceKey },
        body: { storage: { value: storageBody, representation: 'storage' } },
      },
    });
    await check(res, `create page "${title}"`);
    return String((await res.json()).id);
  }

  /** Reads the installed version of an app from UPM. Used only for failure evidence. */
  async appVersion(appKey: string): Promise<string> {
    const res = await this.request.get(`rest/plugins/1.0/${appKey}-key`, { headers: authHeader(this.creds) });
    if (!res.ok()) return `unknown (HTTP ${res.status()})`;
    return String((await res.json()).version ?? 'unknown');
  }
}
