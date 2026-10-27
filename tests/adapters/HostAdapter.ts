import type { Download, Locator, Page } from '@playwright/test';

/**
 * Everything that differs between host products or host versions.
 * Specs and page objects call these methods; they never use host selectors directly.
 * Every method body is wrapped in test.step with a user-level action name.
 */
export interface HostAdapter {
  readonly name: string;

  // Login and administration
  login(page: Page, username: string, password: string): Promise<void>;
  /** Confirms the admin password if the host asks for it (secure administrator sessions). */
  confirmAdminAccessIfAsked(page: Page, password: string): Promise<void>;
  openManageApps(page: Page): Promise<void>;
  /** The app's entry in the host's app management screen. */
  manageAppsEntry(page: Page, appKey: string): Locator;
  /** Expands the app's entry so its details (status, version) are visible. */
  expandManageAppsEntry(page: Page, appKey: string): Promise<void>;
  /** Text inside the expanded entry that says the app is enabled. */
  manageAppsEnabledIndicator(page: Page, appKey: string): Locator;

  // Pages and the editor
  openPageEditor(page: Page, pageId: string): Promise<void>;
  /** Opens the macro browser, searches for the macro and opens its parameter dialog. */
  insertMacroFromBrowser(page: Page, macroTitle: string, macroKey: string): Promise<void>;
  /** The open macro parameter dialog. Page objects scope their field lookups to it. */
  macroDialog(page: Page): Locator;
  /** Confirms the macro dialog (Insert for a new macro, Save for an existing one). */
  confirmMacroDialog(page: Page): Promise<void>;
  /** Opens the parameter dialog of an existing macro in the editor. */
  editExistingMacro(page: Page, macroKey: string): Promise<void>;
  /** The macro placeholder(s) inside the editor content. */
  macroInEditor(page: Page, macroKey: string): Locator;
  /** Types text into the body of a body macro in the editor, one paragraph per line. */
  typeIntoMacroBody(page: Page, macroKey: string, lines: string[]): Promise<void>;
  publishPage(page: Page): Promise<void>;

  // Viewing
  openPage(page: Page, pageId: string): Promise<void>;
  /** The main content area of a page in view mode. */
  pageContent(page: Page): Locator;
  /** Root element(s) of a rendered macro in view mode. */
  renderedMacro(page: Page, macroKey: string): Locator;

  // Export
  /** Exports a page to PDF the way a user does (page menu "Export to PDF") and returns the download. */
  exportPageToPdf(page: Page, pageId: string): Promise<Download>;
}
