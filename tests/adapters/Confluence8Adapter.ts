import { expect, test, type Download, type Locator, type Page } from '@playwright/test';
import type { HostAdapter } from './HostAdapter.js';

/**
 * Confluence 8.x (legacy TinyMCE editor). Selectors verified on 8.5.31; see docs/notes/hosts.md.
 * Host ids and AUI classes are allowed here and nowhere else (CLAUDE.md section 6.3).
 */
export class Confluence8Adapter implements HostAdapter {
  readonly name: string = 'confluence-8';

  /** Login form field ids. Confluence 9 has a redesigned login page (Confluence9Adapter). */
  protected loginFields = { username: '#os_username', password: '#os_password', submit: '#loginButton' };

  private editorFrame(page: Page) {
    return page.frameLocator('#wysiwygTextarea_ifr');
  }

  async login(page: Page, username: string, password: string): Promise<void> {
    await test.step('Log in', async () => {
      await page.goto('login.action');
      await page.locator(this.loginFields.username).fill(username);
      await page.locator(this.loginFields.password).fill(password);
      await page.locator(this.loginFields.submit).click();
      await page.waitForURL((u) => !u.pathname.endsWith('/login.action'), { waitUntil: 'commit' });
    });
  }

  async confirmAdminAccessIfAsked(page: Page, password: string): Promise<void> {
    await test.step('Confirm administrator access if asked', async () => {
      if (!page.url().includes('/authenticate.action')) return;
      await page.locator('#password').fill(password);
      await page.locator('#authenticateButton').click();
      await page.waitForURL((u) => !u.pathname.endsWith('/authenticate.action'), { waitUntil: 'commit' });
    });
  }

  async openManageApps(page: Page): Promise<void> {
    await test.step('Open Manage apps', async () => {
      await page.goto('plugins/servlet/upm/manage/user-installed');
      // UPM loads the app list asynchronously; under load this took more than 15 s.
      const anyAppRow = page.locator('.upm-plugin').first(); // stable-list: any row means the list has loaded
      await expect(anyAppRow).toBeVisible({ timeout: 60_000 });
    });
  }

  manageAppsEntry(page: Page, appKey: string): Locator {
    // data-key is UPM's stable attribute holding the app key.
    return page.locator(`.upm-plugin[data-key="${appKey}"]`);
  }

  async expandManageAppsEntry(page: Page, appKey: string): Promise<void> {
    await test.step('Expand the app entry in Manage apps', async () => {
      const entry = this.manageAppsEntry(page, appKey);
      await entry.locator('.upm-plugin-name').click();
      // Details load asynchronously; the version line appears when they are ready.
      await expect(entry.locator('.upm-details').getByText('Version:')).toBeVisible({ timeout: 60_000 });
    });
  }

  manageAppsEnabledIndicator(page: Page, appKey: string): Locator {
    // UPM shows "N of N modules enabled" for an enabled app ("... disabled" otherwise).
    return this.manageAppsEntry(page, appKey).getByText(/\d+ of \d+ modules enabled/);
  }

  async openPageEditor(page: Page, pageId: string): Promise<void> {
    await test.step('Open the page in the editor', async () => {
      await page.goto(`pages/editpage.action?pageId=${pageId}`);
      await expect(page.locator('#rte-button-publish')).toBeEnabled();
      await expect(this.editorFrame(page).locator('body#tinymce')).toBeVisible();
    });
  }

  async insertMacroFromBrowser(page: Page, macroTitle: string, macroKey: string): Promise<void> {
    await test.step(`Open the macro browser and choose "${macroTitle}"`, async () => {
      await page.locator('#rte-button-insert').click();
      await page.locator('#rte-insert-macro').click();
      const browser = this.macroDialog(page);
      await browser.getByLabel('Search macros').fill(macroTitle);
      // Macro browser items have the id "macro-<macro key>".
      await browser.locator(`#macro-${macroKey}`).click();
      await expect(browser.getByRole('heading', { name: `Insert ‘${macroTitle}’ Macro` })).toBeVisible();
    });
  }

  macroDialog(page: Page): Locator {
    return page.locator('#macro-browser-dialog');
  }

  async confirmMacroDialog(page: Page): Promise<void> {
    await test.step('Confirm the macro dialog', async () => {
      const dialog = this.macroDialog(page);
      await dialog.getByRole('button', { name: /^(Insert|Save)$/ }).click();
      await expect(dialog).toBeHidden();
    });
  }

  macroInEditor(page: Page, macroKey: string): Locator {
    // Confluence renders macros in the editor as <img role="button" aria-label="<key> macro">.
    return this.editorFrame(page).getByRole('button', { name: `${macroKey} macro` });
  }

  async editExistingMacro(page: Page, macroKey: string): Promise<void> {
    await test.step('Open the existing macro for editing', async () => {
      await this.macroInEditor(page, macroKey).click();
      await page.locator('#property-panel').getByRole('button', { name: 'Edit' }).click();
      await expect(this.macroDialog(page).getByRole('heading', { name: /^Edit ‘.+’ Macro$/ })).toBeVisible();
    });
  }

  async typeIntoMacroBody(page: Page, macroKey: string, lines: string[]): Promise<void> {
    await test.step(`Type ${lines.length} line(s) into the macro body`, async () => {
      // A body macro is a <table class="wysiwyg-macro"> in the editor; its body is the td.wysiwyg-macro-body cell.
      const body = this.editorFrame(page).locator(`table.wysiwyg-macro[data-macro-name="${macroKey}"] td.wysiwyg-macro-body`);
      await body.click();
      for (const [i, line] of lines.entries()) {
        if (i > 0) await page.keyboard.press('Enter');
        // insertText types the text as-is (no key-by-key autoformat), and is fast for long lines.
        await page.keyboard.insertText(line);
      }
      for (const line of lines) await expect(body).toContainText(line);
    });
  }

  async publishPage(page: Page): Promise<void> {
    await test.step('Publish the page', async () => {
      await page.locator('#rte-button-publish').click();
      await page.waitForURL((u) => !/\/(resumedraft|editpage)\.action/.test(u.pathname), { waitUntil: 'commit' });
      await expect(this.pageContent(page)).toBeVisible();
    });
  }

  async openPage(page: Page, pageId: string): Promise<void> {
    await test.step('Open the page', async () => {
      await page.goto(`pages/viewpage.action?pageId=${pageId}`);
      await expect(this.pageContent(page)).toBeVisible();
    });
  }

  pageContent(page: Page): Locator {
    return page.locator('#main-content');
  }

  renderedMacro(page: Page, macroKey: string): Locator {
    // Confluence adds data-macro-name to the root element of every rendered macro.
    return this.pageContent(page).locator(`[data-macro-name="${macroKey}"]`);
  }

  async exportPageToPdf(page: Page, pageId: string): Promise<Download> {
    return test.step('Export the page to PDF', async () => {
      await this.openPage(page, pageId);
      // The page menu item "Export to PDF". Its link is followed directly instead of opening the menu,
      // because the admin health-check pop-ups cover the menu button. On 9.2 the link carries an
      // atl_token (XSRF token), so it is read from the page, not built here.
      const item = page.locator('#action-export-pdf-link');
      await expect(item).toHaveText(/Export to PDF/);
      const href = await item.getAttribute('href');
      if (!href) throw new Error('"Export to PDF" menu item has no link');
      const download = page.waitForEvent('download', { timeout: 120_000 });
      // The export answers with the file, so the navigation itself ends with "Download is starting".
      await page.goto(href).catch((e: Error) => {
        if (!e.message.includes('Download is starting')) throw e;
      });
      return download;
    });
  }
}
