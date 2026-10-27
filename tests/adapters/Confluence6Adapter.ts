import { expect, test, type Locator, type Page } from '@playwright/test';
import type { HostAdapter } from './HostAdapter.js';

/**
 * Confluence 6.x. Selectors verified on 6.6.17; see docs/notes/hosts.md.
 * Host ids and AUI classes are allowed here and nowhere else (CLAUDE.md section 6.3).
 */
export class Confluence6Adapter implements HostAdapter {
  readonly name: string = 'confluence-6';

  protected loginFields = { username: '#os_username', password: '#os_password', submit: '#loginButton' };

  async login(page: Page, username: string, password: string): Promise<void> {
    await test.step('Log in', async () => {
      await page.goto('login.action');
      await page.locator(this.loginFields.username).fill(username);
      await page.locator(this.loginFields.password).fill(password);
      await page.locator(this.loginFields.submit).click({ noWaitAfter: true });
      await page.waitForURL((u) => !u.pathname.endsWith('/login.action'), { waitUntil: 'commit' });
    });
  }

  async openDashboard(page: Page): Promise<void> {
    await test.step('Open the dashboard', async () => {
      await page.goto('');
      // Either the logged-in header (user menu) or the login form, depending on who the request is from.
      await expect(page.locator('#user-menu-link').or(this.loginForm(page))).toBeVisible();
    });
  }

  userMenu(page: Page, username: string): Locator {
    // The header user menu link carries the logged-in user's name in data-username.
    return page.locator(`#user-menu-link[data-username="${username}"]`);
  }

  loginForm(page: Page): Locator {
    return page.locator(this.loginFields.username);
  }
}
