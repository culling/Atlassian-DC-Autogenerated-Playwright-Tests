import { test, type Locator, type Page } from '@playwright/test';
import type { HostAdapter } from '../adapters/HostAdapter.js';

/**
 * Parameter dialog of the "Google Maps" macro (macro key googlemaps-embed).
 * Field labels come from the app's i18n file (docs/notes/google-maps-pro.md).
 * The dialog container is host markup, so it comes from the adapter.
 */
export class GoogleMapsMacroDialog {
  constructor(private readonly page: Page, private readonly adapter: HostAdapter) {}

  private get dialog(): Locator {
    return this.adapter.macroDialog(this.page);
  }

  async setLocation(address: string): Promise<void> {
    await test.step(`Enter location "${address}"`, async () => {
      await this.dialog.getByLabel('Location', { exact: true }).fill(address);
    });
  }

  async setGoogleMapLink(url: string): Promise<void> {
    await test.step(`Enter Google Map link "${url}"`, async () => {
      await this.dialog.getByLabel('Google Map link', { exact: true }).fill(url);
    });
  }

  async setMapType(mapType: 'Road map' | 'Satellite'): Promise<void> {
    await test.step(`Choose map type "${mapType}"`, async () => {
      await this.dialog.getByLabel('Map Type', { exact: true }).selectOption(mapType);
    });
  }

  /** `language` is an option name of the macro's language list, for example "Japanese". */
  async setLanguage(language: string): Promise<void> {
    await test.step(`Choose language "${language}"`, async () => {
      await this.dialog.getByLabel('Choose a language', { exact: true }).selectOption(language);
    });
  }

  /** The iframe's title attribute (field "Title"). */
  async setTitle(title: string): Promise<void> {
    await test.step(`Enter title "${title}"`, async () => {
      await this.dialog.getByLabel('Title', { exact: true }).fill(title);
    });
  }

  async confirm(): Promise<void> {
    await test.step('Save the macro settings', async () => {
      await this.adapter.confirmMacroDialog(this.page);
    });
  }
}
