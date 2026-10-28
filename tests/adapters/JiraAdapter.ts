import { expect, test, type Locator, type Page } from '@playwright/test';
import type { HostAdapter } from './HostAdapter.js';

/**
 * Jira Software 8.x. Selectors verified on 8.22.1; see docs/notes/hosts.md.
 * Host ids and AUI classes are allowed here and nowhere else (CLAUDE.md section 6.3).
 */
export class JiraAdapter implements HostAdapter {
  readonly name: string = 'jira';

  protected loginFields = { username: '#login-form-username', password: '#login-form-password', submit: '#login-form-submit' };

  async login(page: Page, username: string, password: string): Promise<void> {
    await test.step('Log in', async () => {
      await page.goto('login.jsp');
      await page.locator(this.loginFields.username).fill(username);
      await page.locator(this.loginFields.password).fill(password);
      await page.locator(this.loginFields.submit).click({ noWaitAfter: true });
      await page.waitForURL((u) => !u.pathname.endsWith('/login.jsp'), { waitUntil: 'commit' });
    });
  }

  async openDashboard(page: Page): Promise<void> {
    await test.step('Open the dashboard', async () => {
      await page.goto('');
      // Either the logged-in header (user menu) or the login prompt, depending on who the request is from.
      await expect(page.locator('#header-details-user-fullname').or(this.loginPrompt(page))).toBeVisible();
    });
  }

  userMenu(page: Page, username: string): Locator {
    // The header user menu link carries the logged-in user's name in data-username.
    return page.locator(`#header-details-user-fullname[data-username="${username}"]`);
  }

  loginPrompt(page: Page): Locator {
    // The header "Log In" link. 10.7.4 shows no login form on the anonymous dashboard (8.22.1 also has a login gadget).
    return page.locator('a.login-link');
  }
}
