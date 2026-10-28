import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import type { SetupInput, SetupWizard } from './SetupWizard.js';

/**
 * Jira Software setup wizard. Screens verified on 8.22.1 and 10.7.4 (docs/notes/hosts.md).
 *
 * The database screen does not appear: env/atl-env.sh writes dbconfig.xml into the home dir.
 * Websudo is turned off by env/atl-env.sh too (jira-config.properties), because Jira has no UI setting.
 *
 * Screens are identified by URL and heading: Jira answers a form POST with the next screen, so the URL can
 * still name the previous screen (the email screen is shown at SetupAdminAccount.jspa). Each screen is
 * submitted exactly once (see Confluence6Wizard: submitting a screen twice can break an instance). An unknown
 * screen stops the run with a list of its form controls, so it can be added here.
 */
export class JiraWizard implements SetupWizard {
  protected loginFields = { username: '#login-form-username', password: '#login-form-password', submit: '#login-form-submit' };

  async runWizard(page: Page, input: SetupInput): Promise<void> {
    await test.step('Wait until Jira serves the setup wizard', async () => {
      // /status reports FIRST_RUN before the plugin system has finished starting; until then pages answer
      // HTTP 503 or an empty page (verified on 10.7.4: about 1 minute after FIRST_RUN).
      await expect
        .poll(async () => {
          const res = await page.goto('/').catch(() => null);
          if (!res || res.status() >= 500) return false;
          return (await screen(page)).heading.length > 0;
        }, { timeout: 15 * 60_000, intervals: [10_000] })
        .toBe(true);
    });
    for (let step = 0; step < 15; step++) {
      const { url, heading } = await screen(page);
      if (!url.includes('/secure/Setup')) return; // set up
      if (heading === 'Set up application properties') await this.applicationProperties(page);
      else if (url.includes('/secure/SetupLicense')) await this.enterLicense(page, input.hostLicense);
      else if (heading === 'Set up administrator account') await this.createAdmin(page, input.admin);
      else if (heading === 'Set up email notifications') await this.emailLater(page);
      else throw new Error(`Unknown setup wizard screen: ${url} "${heading}"\n${await describeScreen(page)}`);
    }
    throw new Error('Setup wizard did not finish within 15 screens');
  }

  /** Clicks a submit control once and waits until another screen (URL or heading) is shown. */
  protected async submit(page: Page, button: Locator, timeout = 120_000): Promise<void> {
    const before = await screen(page);
    await button.click({ noWaitAfter: true });
    await expect
      .poll(async () => {
        const now = await screen(page).catch(() => before); // the page may be between documents
        return now.url !== before.url || now.heading !== before.heading;
      }, { timeout, intervals: [1_000] })
      .toBe(true);
    await page.waitForLoadState('load');
  }

  private async applicationProperties(page: Page): Promise<void> {
    await test.step('Set application properties', async () => {
      await page.locator('input[name="title"]').fill('Jira');
      await page.locator('#jira-setupwizard-mode-private').check();
      // The base URL field is pre-filled from the request address (127.0.0.1:<port>), which is correct.
      await this.submit(page, page.locator('#jira-setupwizard-submit'));
    });
  }

  private async enterLicense(page: Page, license: string): Promise<void> {
    await test.step('Enter host licence', async () => {
      await page.locator('#licenseKey').fill(license);
      // Applying the licence starts the Jira applications, which can take minutes.
      await this.submit(page, page.getByRole('button', { name: 'Next' }), 15 * 60_000);
    });
  }

  private async createAdmin(page: Page, admin: SetupInput['admin']): Promise<void> {
    await test.step('Create administrator', async () => {
      await page.locator('input[name="fullname"]').fill(admin.fullName);
      await page.locator('input[name="email"]').fill(admin.email);
      await page.locator('input[name="username"]').fill(admin.username);
      await page.locator('input[name="password"]').fill(admin.password);
      await page.locator('input[name="confirm"]').fill(admin.password);
      await this.submit(page, page.locator('#jira-setupwizard-submit'), 10 * 60_000);
    });
  }

  private async emailLater(page: Page): Promise<void> {
    await test.step('Configure email notifications later', async () => {
      await page.getByLabel('Later').check();
      // 8.22.1: <input type=submit value=Finish>; 10.7.4: <button>Finish</button>. The role matches both.
      await this.submit(page, page.getByRole('button', { name: 'Finish' }), 10 * 60_000);
    });
  }

  async login(page: Page, username: string, password: string): Promise<void> {
    await test.step('Log in', async () => {
      // On 10.7.4 "Finish" logs the administrator in already, and login.jsp then shows no form.
      // Starting without cookies gives the same login page on every version.
      await page.context().clearCookies();
      await page.goto('login.jsp');
      await page.locator(this.loginFields.username).fill(username);
      await page.locator(this.loginFields.password).fill(password);
      await page.locator(this.loginFields.submit).click({ noWaitAfter: true });
      await page.waitForURL((u) => !u.pathname.endsWith('/login.jsp'), { waitUntil: 'commit' });
    });
  }

  async disableSecureAdminSessions(_page: Page, _password: string): Promise<void> {
    // Done by env/atl-env.sh configure (jira-config.properties: jira.websudo.is.disabled = true).
  }

  /**
   * System plugins whose messages cover the UI on a new instance (verified on 8.22.1, docs/notes/hosts.md):
   * help tips, health check flags.
   * The onboarding plugin stays enabled: on 10.7.4 disabling it makes the welcome page for a new user answer
   * HTTP 500. The "Welcome to Jira" flow is turned off instead by the system property
   * atlassian.darkfeature.jira.onboarding.feature.disabled=true (profile EXTRA_JVM_OPTS; verified on 8.22.1 and 10.7.4).
   */
  protected pluginsToDisable = [
    'com.atlassian.plugins.helptips.jira-help-tips',
    'com.atlassian.troubleshooting.plugin-jira',
  ];

  /** Removes what covers the UI on a new instance: pluginsToDisable, and the "perform a re-index" flag. */
  async disableOnboarding(request: APIRequestContext, username: string, password: string): Promise<void> {
    const auth = {
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      'X-Atlassian-Token': 'no-check',
    };
    await test.step('Disable plugins whose messages cover the UI', async () => {
      for (const key of this.pluginsToDisable) {
        const res = await request.put(`rest/plugins/1.0/${key}-key`, {
          headers: { ...auth, 'Content-Type': 'application/vnd.atl.plugins.plugin+json' },
          data: { enabled: false },
        });
        expect(res.ok(), `disable ${key}: HTTP ${res.status()} ${await res.text()}`).toBeTruthy();
      }
    });
    await test.step('Re-index (removes the "perform a re-index" flag)', async () => {
      const start = await request.post('rest/api/2/reindex?type=BACKGROUND_PREFERRED', { headers: auth });
      expect(start.ok(), `start re-index: HTTP ${start.status()} ${await start.text()}`).toBeTruthy();
      // On a new instance Jira may run the re-index in the foreground: until it finishes, every request is
      // redirected to the progress page ("Max redirect count exceeded" when redirects are followed).
      // So a redirect or any other non-JSON answer means "not finished yet".
      await expect
        .poll(async () => {
          const res = await request.get('rest/api/2/reindex', { headers: auth, maxRedirects: 0 }).catch(() => null);
          if (!res || res.status() !== 200) return false;
          return Boolean((await res.json().catch(() => ({}))).success);
        }, { timeout: 10 * 60_000, intervals: [5_000] })
        .toBe(true);
    });
  }
}

/** URL and first non-empty h1/h2 of the current page. */
async function screen(page: Page): Promise<{ url: string; heading: string }> {
  const heading = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1,h2'))
      .map((h) => (h.textContent ?? '').trim().replace(/\s+/g, ' '))
      .find((t) => t.length > 0) ?? '');
  return { url: page.url(), heading };
}

/** Lists headings and visible form controls of the current page (for unknown wizard screens). */
async function describeScreen(page: Page): Promise<string> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const h of Array.from(document.querySelectorAll('h1,h2,h3'))) out.push('H ' + (h.textContent ?? '').trim().replace(/\s+/g, ' '));
    for (const e of Array.from(document.querySelectorAll<HTMLInputElement>('input,select,textarea,button'))) {
      if (e.type === 'hidden' || !e.offsetParent) continue;
      const label = e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim().replace(/\s+/g, ' ') : '';
      out.push(`${e.tagName} type=${e.type} id=${e.id} name=${e.name} value=${(e.value ?? '').slice(0, 40)} label=${label ?? ''} text=${e.tagName === 'BUTTON' ? (e.textContent ?? '').trim() : ''}`);
    }
    return out.join('\n');
  });
}
