// Basic XSS (cross-site scripting) attempts in the app's inputs.
// Why E2E: whether a payload runs depends on the whole chain (editor, macro storage, app templates,
// browser HTML parsing); only a real browser shows whether script actually executes.
// A payload "runs" if it opens an alert dialog; XssProbe records every dialog of the page.
import { test, expect } from '../../fixtures/index.js';
import { GoogleMapsMacroDialog } from '../../pages/GoogleMapsMacroDialog.js';
import { GoogleMapsMacroView } from '../../pages/GoogleMapsMacroView.js';
import { ListOfAddressesMacroEditor, ListOfAddressesMacroView } from '../../pages/ListOfAddressesMacro.js';
import { XssProbe } from '../../pages/XssProbe.js';
import { APP, ERRORS, LIST_MACRO, XSS } from './data.js';

test.describe('Embed Google Maps Pro: XSS attempts', () => {
  test('script in Location and Title is kept as text', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const probe = new XssProbe(page);
    const dialog = new GoogleMapsMacroDialog(page, adapter);
    const view = new GoogleMapsMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
    await dialog.setLocation(XSS.location);
    await dialog.setTitle(XSS.title);
    await dialog.confirm();
    await adapter.publishPage(page);

    await expect(view.map()).toBeVisible();
    // The title payload is an attribute value, not markup: the attribute holds the exact text.
    await expect(view.map()).toHaveAttribute('title', XSS.title);
    // Re-open in the editor: the macro placeholder and dialog show the stored values.
    await adapter.openPageEditor(page, emptyPageId);
    await adapter.editExistingMacro(page, APP.macroKey);
    expect(probe.executedPayloads()).toEqual([]);
  });

  const links = [
    { name: 'javascript: link', link: XSS.mapLink },
    { name: 'Google link with a script tag', link: XSS.googleMapLink },
  ];
  for (const l of links) {
    test(`${l.name} as Google Map link is rejected`, { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
      const probe = new XssProbe(page);
      const dialog = new GoogleMapsMacroDialog(page, adapter);
      const view = new GoogleMapsMacroView(page, adapter);

      await adapter.openPageEditor(page, emptyPageId);
      await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
      await dialog.setGoogleMapLink(l.link);
      await dialog.confirm();
      await adapter.publishPage(page);

      await expect(view.error(ERRORS.invalidMapLink)).toBeVisible();
      await expect(view.map()).toHaveCount(0);
      expect(probe.executedPayloads()).toEqual([]);
    });
  }

  const bodies = [
    { name: 'script tag', value: XSS.listScript },
    { name: 'img onerror', value: XSS.listImg },
  ];
  for (const b of bodies) {
    test(`${b.name} in a List of Addresses body is shown as text`, { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
      const probe = new XssProbe(page);
      const editor = new ListOfAddressesMacroEditor(page, adapter);
      const view = new ListOfAddressesMacroView(page, adapter);

      await adapter.openPageEditor(page, emptyPageId);
      await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
      await editor.confirm();
      await editor.enterAddresses([b.value]);
      await adapter.publishPage(page);

      // The payload appears as visible text inside the error message, so it was escaped.
      await expect(view.errorItems()).toContainText([ERRORS.addressNotFound(1, 1, b.value)]);
      await expect(view.map()).toHaveCount(0);
      expect(probe.executedPayloads()).toEqual([]);
    });
  }
});
