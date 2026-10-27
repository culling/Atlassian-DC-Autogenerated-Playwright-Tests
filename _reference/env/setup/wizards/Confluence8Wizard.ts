import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { SetupInput, SetupWizard } from './SetupWizard.js';

/**
 * Confluence 8.x setup wizard. Screens verified on 8.5.31 (docs/notes/hosts.md).
 *
 * Some wizard choices are only saved together with the following screen
 * (deployment type + database, user management + administrator). So the flow
 * is driven by the current URL in a loop: after a partial run it resumes from
 * whatever screen the server shows.
 */
export class Confluence8Wizard implements SetupWizard {
  async runWizard(page: Page, input: SetupInput): Promise<void> {
    await page.goto('/');
    for (let step = 0; step < 15; step++) {
      const url = page.url();
      if (url.includes('/setup/setupstart')) await this.chooseProduction(page);
      else if (url.includes('/setup/setuplicense')) await this.enterLicense(page, input.hostLicense);
      else if (url.includes('/setup/setupcluster-start')) await this.chooseNonClustered(page);
      else if (url.includes('/setup/setupdbtype')) await this.connectDatabase(page, input.db);
      else if (url.includes('/setup/setupdata-start')) await this.chooseEmptySite(page);
      else if (url.includes('/setup/setupusermanagementchoice')) await this.chooseInternalUsers(page);
      else if (url.includes('/setup/setupadministrator')) await this.createAdmin(page, input.admin);
      else if (url.includes('/setup/finishsetup')) return;
      else if (!url.includes('/setup/')) return; // already set up
      else throw new Error(`Unknown setup wizard screen: ${url}`);
    }
    throw new Error('Setup wizard did not finish within 15 screens');
  }

  private async next(page: Page, fromUrlPart: string, timeout = 60_000): Promise<void> {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForURL((u) => !u.href.includes(fromUrlPart), { timeout });
  }

  private async chooseProduction(page: Page): Promise<void> {
    await test.step('Choose production installation', async () => {
      await page.getByRole('heading', { name: 'Production Installation' }).click();
      await this.next(page, '/setup/setupstart');
    });
  }

  private async enterLicense(page: Page, license: string): Promise<void> {
    await test.step('Enter host licence', async () => {
      await page.locator('#confLicenseString').fill(license);
      await this.next(page, '/setup/setuplicense');
    });
  }

  private async chooseNonClustered(page: Page): Promise<void> {
    await test.step('Choose non-clustered deployment', async () => {
      await page.getByLabel('Non-clustered (single node)').check();
      await this.next(page, '/setup/setupcluster-start');
    });
  }

  private async connectDatabase(page: Page, db: SetupInput['db']): Promise<void> {
    await test.step('Connect to PostgreSQL', async () => {
      await page.locator('#dbConfigInfo-databaseType').selectOption('postgresql');
      await page.locator('#dbConfigInfo-simple').check();
      await page.locator('#dbConfigInfo-hostname').fill(db.host);
      await page.locator('#dbConfigInfo-port').fill(db.port);
      await page.locator('#dbConfigInfo-databaseName').fill(db.name);
      await page.locator('#dbConfigInfo-username').fill(db.user);
      await page.locator('#dbConfigInfo-password').fill(db.password);
      await page.getByRole('button', { name: 'Test connection' }).click();
      await expect(page.getByText('Database connected successfully')).toBeVisible();
      // Creating the schema takes minutes and shows a progress overlay over the button,
      // so the click does not wait for actionability after the first attempt.
      await page.locator('#setup-next-button').click({ noWaitAfter: true });
      await page.waitForURL((u) => !u.href.includes('/setup/setupdbtype'), { timeout: 15 * 60_000 });
    });
  }

  private async chooseEmptySite(page: Page): Promise<void> {
    await test.step('Choose empty site', async () => {
      await page.getByRole('button', { name: 'Empty Site' }).click();
      await page.waitForURL((u) => !u.href.includes('/setup/setupdata-start'), { timeout: 10 * 60_000 });
    });
  }

  private async chooseInternalUsers(page: Page): Promise<void> {
    await test.step('Manage users within Confluence', async () => {
      await page.getByRole('button', { name: 'Manage users and groups within Confluence' }).click();
      await page.waitForURL(/\/setup\/setupadministrator/);
    });
  }

  private async createAdmin(page: Page, admin: SetupInput['admin']): Promise<void> {
    await test.step('Create administrator account', async () => {
      await page.locator('#username').fill(admin.username);
      await page.locator('#fullName').fill(admin.fullName);
      await page.locator('#email').fill(admin.email);
      await page.locator('#password').fill(admin.password);
      await page.locator('#confirm').fill(admin.password);
      await this.next(page, '/setup/setupadministrator', 5 * 60_000);
      await expect(page.getByRole('heading', { name: 'Setup Successful' })).toBeVisible();
    });
  }

  /** Login form field ids. Confluence 9 has a redesigned login page (Confluence9Wizard). */
  protected loginFields = { username: '#os_username', password: '#os_password', submit: '#loginButton' };

  async login(page: Page, username: string, password: string): Promise<void> {
    await test.step('Log in as administrator', async () => {
      await page.goto('/login.action');
      // Directly after the wizard the browser is already logged in. Then 8.5 shows
      // "You are currently logged in as <user>" instead of the form, and 9.2 redirects away.
      if (!page.url().includes('/login.action')) return;
      const form = page.locator(this.loginFields.username);
      const alreadyLoggedIn = page.getByText('You are currently logged in as');
      await expect(form.or(alreadyLoggedIn)).toBeVisible();
      if (await alreadyLoggedIn.isVisible()) return;
      await form.fill(username);
      await page.locator(this.loginFields.password).fill(password);
      await page.locator(this.loginFields.submit).click();
      await page.waitForURL((u) => !u.pathname.endsWith('/login.action'), { waitUntil: 'commit' });
    });
  }

  async disableSecureAdminSessions(page: Page, password: string): Promise<void> {
    await test.step('Disable secure administrator sessions', async () => {
      await page.goto('/admin/editsecurityconfig.action');
      if (page.url().includes('/authenticate.action')) {
        await page.locator('#password').fill(password);
        await page.locator('#authenticateButton').click();
        await page.waitForURL(/editsecurityconfig\.action/, { waitUntil: 'commit' });
      }
      // The AUI checkbox is covered by its label, so the label is clicked.
      const checkbox = page.locator('#webSudoEnabled');
      if (await checkbox.isChecked()) await page.locator('label[for="webSudoEnabled"]').click();
      await expect(checkbox).not.toBeChecked();
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForURL((u) => !u.pathname.endsWith('/editsecurityconfig.action'), { waitUntil: 'commit' });
      await page.goto('/admin/viewsecurityconfig.action');
      await expect(page.getByText('Secure administrator sessions').first()).toBeVisible();
    });
  }

  async disableOnboarding(request: APIRequestContext, username: string, password: string): Promise<void> {
    await test.step('Disable onboarding and "What\'s New"', async () => {
      const headers = {
        Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        'X-Atlassian-Token': 'no-check',
        'Content-Type': 'application/vnd.atl.plugins.plugin+json',
      };
      for (const key of [
        'com.atlassian.confluence.plugins.confluence-onboarding',
        'com.atlassian.confluence.plugins.whatsnew',
      ]) {
        const res = await request.put(`rest/plugins/1.0/${key}-key`, { headers, data: { enabled: false } });
        expect(res.ok(), `disable ${key}: HTTP ${res.status()} ${await res.text()}`).toBeTruthy();
      }
    });
  }
}
