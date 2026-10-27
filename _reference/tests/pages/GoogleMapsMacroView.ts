import type { Locator, Page } from '@playwright/test';
import type { HostAdapter } from '../adapters/HostAdapter.js';

const MACRO_KEY = 'googlemaps-embed';

/**
 * The rendered "Google Maps" macro on a page in view mode.
 * Rendered output (verified on 8.5.31, app 8.1.5):
 *   map:   <iframe src="https://www.google.com/maps/embed/v1/search?q=...&maptype=...">
 *   error: <div class="techtime-error-container"><div class="aui-message aui-message-error">message</div></div>
 * Neither element has a test id, role or accessible name, so the element type is used.
 * Do not assert on map tiles: they are cross-origin Google content (CLAUDE.md 5.4.1).
 */
export class GoogleMapsMacroView {
  constructor(private readonly page: Page, private readonly adapter: HostAdapter) {}

  private get macro(): Locator {
    return this.adapter.renderedMacro(this.page, MACRO_KEY);
  }

  /** The embedded map iframe. */
  map(): Locator {
    return this.macro.and(this.page.locator('iframe'));
  }

  /** The app's error message box with the given text. */
  error(message: string): Locator {
    return this.macro.getByText(message);
  }
}

/**
 * Pattern matching one query parameter in the iframe src, encoded the way the app writes it
 * (form encoding: spaces become "+", commas "%2C"). Example: srcParam('maptype', 'satellite').
 */
export function srcParam(name: string, value: string): RegExp {
  const encoded = new URLSearchParams({ [name]: value }).toString();
  return new RegExp(`[?&]${encoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(&|$)`);
}
