// The "Google Maps for a List of Addresses" macro.
// Why E2E: the addresses are typed into a Confluence body macro in the editor and geocoded while
// Confluence renders the page; unit tests of the app code have neither the editor nor the renderer.
import { test, expect } from '../../fixtures/index.js';
import { ListOfAddressesMacroEditor, ListOfAddressesMacroView, markers } from '../../pages/ListOfAddressesMacro.js';
import { srcParam } from '../../pages/GoogleMapsMacroView.js';
import { ADDRESSES, BAD_ADDRESS_STRINGS, ERRORS, LIST_MACRO, UNICODE_ADDRESS_LIST, UNKNOWN_ADDRESSES } from './data.js';

const STATIC_MAP = /^https:\/\/maps\.googleapis\.com\/maps\/api\/staticmap\?/;

test.describe('Embed Google Maps Pro: list of addresses', () => {
  test('two addresses show one map with two markers', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const editor = new ListOfAddressesMacroEditor(page, adapter);
    const view = new ListOfAddressesMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
    await editor.confirm();
    await editor.enterAddresses([ADDRESSES.secondary, ADDRESSES.primary]);
    await adapter.publishPage(page);

    await expect(view.map()).toBeVisible();
    await expect(view.map()).toHaveAttribute('src', STATIC_MAP);
    await expect(view.map()).toHaveAttribute('src', markers(2));
    await expect(view.map()).toHaveAttribute('src', srcParam('size', '600x400'));
  });

  test('size, map type and language are applied', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const editor = new ListOfAddressesMacroEditor(page, adapter);
    const view = new ListOfAddressesMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
    await editor.setSize(500, 300);
    await editor.setMapType('Satellite');
    await editor.setLanguage('Japanese');
    await editor.confirm();
    await editor.enterAddresses([ADDRESSES.secondary]);
    await adapter.publishPage(page);

    await expect(view.map()).toHaveAttribute('src', markers(1));
    await expect(view.map()).toHaveAttribute('src', srcParam('size', '500x300'));
    await expect(view.map()).toHaveAttribute('src', srcParam('maptype', 'satellite'));
    await expect(view.map()).toHaveAttribute('src', srcParam('language', 'ja'));
  });

  test('unicode addresses are found', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const editor = new ListOfAddressesMacroEditor(page, adapter);
    const view = new ListOfAddressesMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
    await editor.confirm();
    await editor.enterAddresses(UNICODE_ADDRESS_LIST);
    await adapter.publishPage(page);

    await expect(view.map()).toHaveAttribute('src', markers(UNICODE_ADDRESS_LIST.length));
  });
});

test.describe('Embed Google Maps Pro: list of addresses with bad input', () => {
  test('one unknown address among valid ones is reported by its position', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const editor = new ListOfAddressesMacroEditor(page, adapter);
    const view = new ListOfAddressesMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
    await editor.confirm();
    await editor.enterAddresses([ADDRESSES.secondary, UNKNOWN_ADDRESSES[0]]);
    await adapter.publishPage(page);

    await expect(view.error(ERRORS.listHeading)).toBeVisible();
    await expect(view.errorItems()).toHaveCount(1);
    await expect(view.errorItems()).toContainText([ERRORS.addressNotFound(2, 2, UNKNOWN_ADDRESSES[0])]);
    await expect(view.map()).toHaveCount(0);
  });

  test('every unknown address gets its own error line', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const editor = new ListOfAddressesMacroEditor(page, adapter);
    const view = new ListOfAddressesMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
    await editor.confirm();
    await editor.enterAddresses([UNKNOWN_ADDRESSES[0], ADDRESSES.secondary, UNKNOWN_ADDRESSES[1]]);
    await adapter.publishPage(page);

    await expect(view.errorItems()).toContainText([
      ERRORS.addressNotFound(1, 3, UNKNOWN_ADDRESSES[0]),
      ERRORS.addressNotFound(3, 3, UNKNOWN_ADDRESSES[1]),
    ]);
    await expect(view.map()).toHaveCount(0);
  });

  for (const bad of BAD_ADDRESS_STRINGS) {
    test(`bad string (${bad.name}) shows a "cannot find" error`, { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
      const editor = new ListOfAddressesMacroEditor(page, adapter);
      const view = new ListOfAddressesMacroView(page, adapter);

      await adapter.openPageEditor(page, emptyPageId);
      await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
      await editor.confirm();
      await editor.enterAddresses([bad.value]);
      await adapter.publishPage(page);

      await expect(view.error(ERRORS.listHeading)).toBeVisible();
      await expect(view.errorItems()).toContainText([ERRORS.addressNotFound(1, 1, bad.value)]);
      await expect(view.map()).toHaveCount(0);
    });
  }
});
