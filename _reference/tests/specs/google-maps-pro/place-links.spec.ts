// Google Maps "place" links in the Google Maps macro.
// Why E2E: the app resolves the link to a Google place id while Confluence renders the page;
// this needs the real macro renderer and Google, which unit tests of the app code do not have.
import { test, expect } from '../../fixtures/index.js';
import { GoogleMapsMacroDialog } from '../../pages/GoogleMapsMacroDialog.js';
import { GoogleMapsMacroView } from '../../pages/GoogleMapsMacroView.js';
import { APP, PLACE_LINKS } from './data.js';

/** The src the app renders for a place link. The place id itself comes from Google and is not checked. */
const PLACE_EMBED = /^https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?q=place_id:[\w-]+&/;

test.describe('Embed Google Maps Pro: place links', () => {
  const cases = [
    { name: 'place link with a name', link: PLACE_LINKS.byName },
    { name: 'place link with unicode name', link: PLACE_LINKS.unicode },
  ];
  for (const c of cases) {
    test(`${c.name} shows the place`, { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
      const dialog = new GoogleMapsMacroDialog(page, adapter);
      const view = new GoogleMapsMacroView(page, adapter);

      await adapter.openPageEditor(page, emptyPageId);
      await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
      await dialog.setGoogleMapLink(c.link);
      await dialog.confirm();
      await adapter.publishPage(page);

      await expect(view.map()).toBeVisible();
      await expect(view.map()).toHaveAttribute('src', PLACE_EMBED);
    });
  }

  test('place link with coordinates centres the map on them', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const dialog = new GoogleMapsMacroDialog(page, adapter);
    const view = new GoogleMapsMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
    await dialog.setGoogleMapLink(PLACE_LINKS.withCoordinates);
    await dialog.confirm();
    await adapter.publishPage(page);

    await expect(view.map()).toHaveAttribute('src', PLACE_EMBED);
    // The app writes the centre unencoded: center=<lat>,<lng>
    await expect(view.map()).toHaveAttribute('src', new RegExp(`[?&]center=${PLACE_LINKS.center.replace(/\./g, '\\.')}(&|$)`));
  });
});
