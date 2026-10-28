import type { Locator, Page } from '@playwright/test';

/**
 * Everything that differs between host products or host versions.
 * Specs and page objects call these methods; they never use host selectors directly.
 * Every method body is wrapped in test.step with a user-level action name.
 */
export interface HostAdapter {
  readonly name: string;

  /** Logs in through the host's login form. */
  login(page: Page, username: string, password: string): Promise<void>;
  /** Opens the host's start page (dashboard). Anonymous users are sent to the login page. */
  openDashboard(page: Page): Promise<void>;
  /** The header user menu of the logged-in user `username` (visible only when that user is logged in). */
  userMenu(page: Page, username: string): Locator;
  /**
   * What the host shows a visitor who is not logged in, on the page openDashboard opens:
   * the login form (Confluence) or the header "Log In" link (Jira).
   */
  loginPrompt(page: Page): Locator;
}
