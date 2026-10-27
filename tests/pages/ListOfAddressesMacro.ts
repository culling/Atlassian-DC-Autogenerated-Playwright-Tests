import { test, type Locator, type Page } from '@playwright/test';
import type { HostAdapter } from '../adapters/HostAdapter.js';

const MACRO_KEY = 'googlemaps-list-of-addresses';

/**
 * The "Google Maps for a List of Addresses" macro in the editor: its parameter dialog and its body.
 * The dialog fields have no i18n labels; Confluence shows the parameter names ("width", "height",
 * "language", "maptype", "zoom") as labels (verified on 8.5.31, app 8.1.5).
 * The addresses go into the macro body, one per line.
 */
export class ListOfAddressesMacroEditor {
  constructor(private readonly page: Page, private readonly adapter: HostAdapter) {}

  private get dialog(): Locator {
    return this.adapter.macroDialog(this.page);
  }

  async setSize(width: number, height: number): Promise<void> {
    await test.step(`Set map size ${width} x ${height}`, async () => {
      await this.dialog.getByLabel('width', { exact: true }).fill(String(width));
      await this.dialog.getByLabel('height', { exact: true }).fill(String(height));
    });
  }

  async setLanguage(language: string): Promise<void> {
    await test.step(`Choose language "${language}"`, async () => {
      await this.dialog.getByLabel('language', { exact: true }).selectOption(language);
    });
  }

  async setMapType(mapType: 'Road map' | 'Satellite'): Promise<void> {
    await test.step(`Choose map type "${mapType}"`, async () => {
      await this.dialog.getByLabel('maptype', { exact: true }).selectOption(mapType);
    });
  }

  async confirm(): Promise<void> {
    await test.step('Save the macro settings', async () => {
      await this.adapter.confirmMacroDialog(this.page);
    });
  }

  /** Types the addresses into the macro body, one line each. Call after confirm(). */
  async enterAddresses(addresses: string[]): Promise<void> {
    await test.step(`Enter ${addresses.length} address(es)`, async () => {
      await this.adapter.typeIntoMacroBody(this.page, MACRO_KEY, addresses);
    });
  }
}

/**
 * The rendered "Google Maps for a List of Addresses" macro in view mode.
 * Rendered output (verified on 8.5.31 and 9.2.26, app 8.1.5):
 *   map:    <img src="https://maps.googleapis.com/maps/api/staticmap?...&size=600x400&markers=color%3Ared%7C<lat>%2C<lng>%7C...&maptype=roadmap&language=en">
 *   errors: <div class="techtime-error-container"><div class="aui-message aui-message-error">
 *             <p>Error processing addresses:</p><ul><li>Address 2 of 2 - Google Maps cannot find ...</li></ul>
 * The image has no test id, role or accessible name (no alt), so the element type is used.
 * Do not assert on the map picture or the coordinates Google returns (CLAUDE.md 5.4.1).
 */
export class ListOfAddressesMacroView {
  constructor(private readonly page: Page, private readonly adapter: HostAdapter) {}

  private get macro(): Locator {
    return this.adapter.renderedMacro(this.page, MACRO_KEY);
  }

  /** The static map image. */
  map(): Locator {
    return this.macro.and(this.page.locator('img'));
  }

  /** The app's error box, or a line in it, containing the given text. */
  error(message: string): Locator {
    return this.macro.getByText(message);
  }

  /** One entry per address the app could not show. */
  errorItems(): Locator {
    return this.macro.getByRole('listitem');
  }
}

/** Pattern matching a static map src with exactly `n` markers (coordinates, not their values). */
export function markers(n: number): RegExp {
  const coordinate = '-?\\d+(\\.\\d+)?%2C-?\\d+(\\.\\d+)?';
  return new RegExp(`[?&]markers=color%3Ared(%7C${coordinate}){${n}}(&|$)`);
}
