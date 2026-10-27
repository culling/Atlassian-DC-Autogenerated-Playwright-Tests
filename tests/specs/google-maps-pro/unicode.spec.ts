// Unicode input for the Google Maps macro.
// Why E2E: the text passes through the Confluence editor, macro storage and the app's renderer;
// encoding problems appear only across those layers, which unit tests of the app code do not cover.
import { test, expect } from '../../fixtures/index.js';
import { GoogleMapsMacroDialog } from '../../pages/GoogleMapsMacroDialog.js';
import { GoogleMapsMacroView, srcParam } from '../../pages/GoogleMapsMacroView.js';
import { APP, UNICODE_LOCATIONS } from './data.js';

test.describe('Embed Google Maps Pro: unicode', () => {
  for (const location of UNICODE_LOCATIONS) {
    test(`location in ${location.name} with language ${location.language}`, { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
      const dialog = new GoogleMapsMacroDialog(page, adapter);
      const view = new GoogleMapsMacroView(page, adapter);

      await adapter.openPageEditor(page, emptyPageId);
      await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
      await dialog.setLocation(location.address);
      await dialog.setLanguage(location.language);
      await dialog.confirm();
      await adapter.publishPage(page);

      await expect(view.map()).toBeVisible();
      await expect(view.map()).toHaveAttribute('src', srcParam('q', location.address));
      await expect(view.map()).toHaveAttribute('src', srcParam('language', location.code));
    });
  }
});
