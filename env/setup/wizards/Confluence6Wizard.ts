import { expect, test, type Page } from '@playwright/test';
import type { SetupInput, SetupWizard } from './SetupWizard.js';
import { Confluence8Wizard } from './Confluence8Wizard.js';

/**
 * Confluence 6.x setup wizard. Screens verified on 6.6.17 (docs/notes/hosts.md). Differences from 8.5:
 *
 * 1. An extra "Get add-ons" screen (/setup/selectbundle) after the production choice: nothing is selected.
 * 2. A Data Center licence requires a cluster: there is no "non-clustered" choice. A one-node cluster is
 *    created, with the shared home inside the home volume (so the snapshot contains it) and multicast join
 *    (so no container IP address is stored).
 * 3. The form buttons never pass Playwright's "stable" check, and a click that reported a timeout had in
 *    fact submitted the form. Submitting a screen twice left the instance broken ("Container is not setup").
 *    So every submit is one forced click, followed by a wait for the next URL.
 */
export class Confluence6Wizard extends Confluence8Wizard implements SetupWizard {
  override async runWizard(page: Page, input: SetupInput): Promise<void> {
    await page.goto('/');
    for (let step = 0; step < 15; step++) {
      const url = page.url();
      if (url.includes('/setup/setupstart')) await this.chooseProduction6(page);
      else if (url.includes('/setup/selectbundle')) await this.skipAddOns(page);
      else if (url.includes('/setup/setuplicense')) await this.enterLicense6(page, input.hostLicense);
      else if (url.includes('/setup/setupcluster-start')) await this.createSingleNodeCluster(page);
      else if (url.includes('/setup/setupdbtype')) await this.connectDatabase6(page, input.db);
      else if (url.includes('/setup/setupdata-start')) await this.chooseEmptySite6(page);
      else if (url.includes('/setup/setupusermanagementchoice')) await this.chooseInternalUsers6(page);
      else if (url.includes('/setup/setupadministrator')) await this.createAdmin6(page, input.admin);
      else if (url.includes('/setup/finishsetup')) return;
      else if (!url.includes('/setup/')) return; // already set up
      else throw new Error(`Unknown setup wizard screen: ${url}`);
    }
    throw new Error('Setup wizard did not finish within 15 screens');
  }

  /** One forced click on a submit control, then wait until the URL no longer contains `fromUrlPart`. */
  private async submit(page: Page, selector: string, fromUrlPart: string, timeout = 120_000): Promise<void> {
    await page.locator(selector).click({ force: true, noWaitAfter: true });
    await page.waitForURL((u) => !u.href.includes(fromUrlPart), { timeout, waitUntil: 'commit' });
    await page.waitForLoadState('domcontentloaded');
  }

  private async chooseProduction6(page: Page): Promise<void> {
    await test.step('Choose production installation', async () => {
      await page.getByRole('heading', { name: 'Production Installation' }).click();
      await this.submit(page, '#setup-next-button', '/setup/setupstart');
    });
  }

  private async skipAddOns(page: Page): Promise<void> {
    await test.step('Get add-ons: select nothing', async () => {
      await this.submit(page, '#setup-next-button', '/setup/selectbundle');
    });
  }

  private async enterLicense6(page: Page, license: string): Promise<void> {
    await test.step('Enter host licence', async () => {
      await page.locator('#confLicenseString').fill(license);
      await this.submit(page, '#setupTypeCustom', '/setup/setuplicense');
    });
  }

  private async createSingleNodeCluster(page: Page): Promise<void> {
    await test.step('Create a one-node cluster', async () => {
      await page.locator('#clusterName').fill('atl-test');
      await page.locator('#clusterHome').fill('/var/atlassian/application-data/confluence/shared-home');
      await page.locator('input[name="networkInterface"]').check(); // the container has one interface (eth0)
      await page.locator('#useMulticast').check();
      // The form has a hidden second "newCluster" input; only the visible button is clicked.
      await this.submit(page, 'input[name="newCluster"]:visible', '/setup/setupcluster-start');
    });
  }

  private async connectDatabase6(page: Page, db: SetupInput['db']): Promise<void> {
    await test.step('Connect to PostgreSQL', async () => {
      await page.locator('#dbConfigInfo-databaseType').selectOption('postgresql');
      await page.locator('#dbConfigInfo-simple').check();
      await page.locator('#dbConfigInfo-hostname').fill(db.host);
      await page.locator('#dbConfigInfo-port').fill(db.port);
      await page.locator('#dbConfigInfo-databaseName').fill(db.name);
      await page.locator('#dbConfigInfo-username').fill(db.user);
      await page.locator('#dbConfigInfo-password').fill(db.password);
      await page.locator('#testConnection').click({ force: true });
      await expect(page.getByText('Database connected successfully')).toBeVisible();
      // Creating the schema took about 5 minutes on 6.6.17.
      await this.submit(page, '#setup-next-button', '/setup/setupdbtype', 20 * 60_000);
    });
  }

  private async chooseEmptySite6(page: Page): Promise<void> {
    await test.step('Choose empty site', async () => {
      await this.submit(page, 'input[value="Empty Site"]', '/setup/setupdata-start', 10 * 60_000);
    });
  }

  private async chooseInternalUsers6(page: Page): Promise<void> {
    await test.step('Manage users within Confluence', async () => {
      await this.submit(page, '#internal', '/setup/setupusermanagementchoice');
    });
  }

  /** Same as 8.5, but Save is clicked without waiting for navigation: on 6.6.17 the save worked, but a
   * normal click waited for "scheduled navigations" until it timed out. */
  override async disableSecureAdminSessions(page: Page, password: string): Promise<void> {
    await test.step('Disable secure administrator sessions', async () => {
      await page.goto('/admin/editsecurityconfig.action');
      if (page.url().includes('/authenticate.action')) {
        await page.locator('#password').fill(password);
        await this.submit(page, '#authenticateButton', '/authenticate.action');
      }
      const checkbox = page.locator('#webSudoEnabled');
      if (await checkbox.isChecked()) await page.locator('label[for="webSudoEnabled"]').click();
      await expect(checkbox).not.toBeChecked();
      await this.submit(page, 'input[name="confirm"][value="Save"]', '/editsecurityconfig.action');
      await page.goto('/admin/viewsecurityconfig.action');
      await expect(page.locator('input[name="webSudoEnabled"]')).not.toBeChecked();
    });
  }

  private async createAdmin6(page: Page, admin: SetupInput['admin']): Promise<void> {
    await test.step('Create administrator account', async () => {
      await page.locator('#username').fill(admin.username);
      await page.locator('#fullName').fill(admin.fullName);
      await page.locator('#email').fill(admin.email);
      await page.locator('#password').fill(admin.password);
      await page.locator('#confirm').fill(admin.password);
      await this.submit(page, '#setup-next-button', '/setup/setupadministrator', 5 * 60_000);
      await expect(page.getByRole('heading', { name: 'Setup Successful' })).toBeVisible();
    });
  }
}
