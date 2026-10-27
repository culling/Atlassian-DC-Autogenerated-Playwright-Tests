import type { APIRequestContext, Page } from '@playwright/test';

export interface SetupInput {
  hostLicense: string;
  db: { host: string; port: string; name: string; user: string; password: string };
  admin: { username: string; password: string; fullName: string; email: string };
}

/**
 * Host-version-specific first-time setup. One implementation per wizard flow,
 * selected by SETUP_WIZARD in the profile. The setup file contains no version branches.
 */
export interface SetupWizard {
  /** Runs the setup wizard from FIRST_RUN until the instance is RUNNING. */
  runWizard(page: Page, input: SetupInput): Promise<void>;
  login(page: Page, username: string, password: string): Promise<void>;
  /** Turns off "Secure administrator sessions" (websudo). Test instances only. */
  disableSecureAdminSessions(page: Page, password: string): Promise<void>;
  /** Disables onboarding / "what's new" so they do not cover other UI. REST is allowed: this is setup. */
  disableOnboarding(request: APIRequestContext, username: string, password: string): Promise<void>;
}
