import { expect, test, type Locator, type Page } from '@playwright/test';

export interface HeaderRule {
  /** HTTP header name. */
  name: string;
  /** "Get Username": use the header value as the username to log in. */
  getUsername: boolean;
}

/**
 * EasySSO admin screen "Custom Authentication" (EasySSO Admin > Headers), URL /plugins/servlet/easysso/admin/headers.
 * Markup verified on EasySSO 5.2.4 / Confluence 6.6.17 (docs/notes/easysso.md).
 *
 * The rule table has no test ids, and its inputs have no accessible names (every text input has the title
 * "Text input"). Its fields are selected by the app's own data-id attributes (type, name, getUsername,
 * disableNTLM, ipFilter): documented exception in CLAUDE.md section 6.3.
 */
export class EasySsoHeadersConfig {
  constructor(private readonly page: Page) {}

  private form(): Locator {
    return this.page.locator('#custom-auth-form');
  }

  /** Rule rows of the table. The form also holds a hidden template row outside #custom-auth-tbody. */
  rules(): Locator {
    return this.page.locator('#custom-auth-tbody .custom-auth-rule');
  }

  async open(): Promise<void> {
    await test.step('Open EasySSO > Headers (Custom Authentication)', async () => {
      // The page script binds the buttons and then loads the saved rules (GET rest/easysso/1.0/headers).
      // A click before that does nothing (seen once in 10 runs), so the load is awaited.
      const rulesLoaded = this.page.waitForResponse(
        (r) => r.url().includes('/rest/easysso/1.0/headers') && r.request().method() === 'GET',
      );
      await this.page.goto('plugins/servlet/easysso/admin/headers');
      await rulesLoaded;
      await expect(this.page.getByRole('heading', { name: 'Custom Authentication' })).toBeVisible();
      await expect(this.form().getByRole('button', { name: 'Save' })).toBeVisible();
    });
  }

  async addRule(rule: HeaderRule): Promise<void> {
    await test.step(`Add header rule "${rule.name}"`, async () => {
      const before = await this.rules().count();
      // The button label includes the quotation marks. Two buttons have it (table header and below the table).
      await this.form().getByRole('button', { name: '"Add a new Custom Authentication Rule"' }).first().click(); // stable-list: both buttons add a row
      await expect(this.rules()).toHaveCount(before + 1);
      const row = this.rules().last(); // stable-list: a new row is always added at the end of the table
      await row.locator('[data-id="type"]').selectOption('header');
      await row.locator('[data-id="name"]').fill(rule.name);
      await row.locator('[data-id="getUsername"]').setChecked(rule.getUsername);
    });
  }

  async save(): Promise<void> {
    await test.step('Save the header rules', async () => {
      await this.form().getByRole('button', { name: 'Save' }).click();
      await expect(this.savedMessage()).toBeVisible();
    });
  }

  /** Success message shown after Save ("Saved"); it fades out after 3 s. */
  savedMessage(): Locator {
    return this.page.locator('#ajax-result').getByText('Saved', { exact: true });
  }
}
