import type { Dialog, Page } from '@playwright/test';

/**
 * Records JavaScript dialogs (alert, confirm, prompt) opened by any frame of the page.
 * The XSS payloads in the tests call alert('<marker>'); if one runs, its marker is recorded here.
 * Create it at the start of a test, before any payload can render.
 * "beforeunload" dialogs (leaving the editor) are Confluence's own and are not recorded.
 */
export class XssProbe {
  private readonly messages: string[] = [];

  constructor(page: Page) {
    page.on('dialog', (dialog: Dialog) => {
      if (dialog.type() !== 'beforeunload') this.messages.push(`${dialog.type()}: ${dialog.message()}`);
      void dialog.dismiss().catch(() => {});
    });
  }

  /** Dialogs opened so far; an empty list means no payload ran. */
  executedPayloads(): string[] {
    return [...this.messages];
  }
}
