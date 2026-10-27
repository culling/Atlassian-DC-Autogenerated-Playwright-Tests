// Smoke tests for Embed Google Maps Pro (CLAUDE.md section 5.3).
// Why E2E: each test checks the app inside a real Confluence editor, macro browser and page renderer;
// those host integrations cannot be exercised by unit or integration tests of the app code.
import { test, expect } from '../../fixtures/index.js';
import { GoogleMapsMacroDialog } from '../../pages/GoogleMapsMacroDialog.js';
import { GoogleMapsMacroView, srcParam } from '../../pages/GoogleMapsMacroView.js';
import { ADDRESSES, APP, ERRORS, INVALID_MAP_LINK } from './data.js';

test.describe('Embed Google Maps Pro', () => {
  test('app is installed and enabled', { tag: '@smoke' }, async ({ page, adapter }) => {
    await adapter.openManageApps(page);
    await expect(adapter.manageAppsEntry(page, APP.key)).toContainText(APP.name);

    await adapter.expandManageAppsEntry(page, APP.key);
    await expect(adapter.manageAppsEnabledIndicator(page, APP.key)).toBeVisible();
  });

  test('insert map with an address and view it', { tag: '@smoke' }, async ({ page, adapter, emptyPageId }) => {
    const dialog = new GoogleMapsMacroDialog(page, adapter);
    const view = new GoogleMapsMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
    await dialog.setLocation(ADDRESSES.primary);
    await dialog.confirm();
    await expect(adapter.macroInEditor(page, APP.macroKey)).toBeVisible();
    await adapter.publishPage(page);

    await expect(view.map()).toBeVisible();
    await expect(view.map()).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps\/embed\/v1\/search\?/);
    await expect(view.map()).toHaveAttribute('src', srcParam('q', ADDRESSES.primary));
  });

  test('edit an existing map and change the map type', { tag: '@smoke' }, async ({ page, adapter, emptyPageId }) => {
    const dialog = new GoogleMapsMacroDialog(page, adapter);
    const view = new GoogleMapsMacroView(page, adapter);

    // Precondition: a page with a road map, created through the editor UI.
    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
    await dialog.setLocation(ADDRESSES.secondary);
    await dialog.confirm();
    await adapter.publishPage(page);
    await expect(view.map()).toHaveAttribute('src', srcParam('maptype', 'roadmap'));

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.editExistingMacro(page, APP.macroKey);
    await dialog.setMapType('Satellite');
    await dialog.confirm();
    await adapter.publishPage(page);

    await expect(view.map()).toHaveAttribute('src', srcParam('maptype', 'satellite'));
    await expect(view.map()).toHaveAttribute('src', srcParam('q', ADDRESSES.secondary));
  });

  test('invalid Google Map link shows an error message', { tag: '@smoke' }, async ({ page, adapter, emptyPageId }) => {
    const dialog = new GoogleMapsMacroDialog(page, adapter);
    const view = new GoogleMapsMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
    await dialog.setGoogleMapLink(INVALID_MAP_LINK);
    await dialog.confirm();
    await adapter.publishPage(page);

    await expect(view.error(ERRORS.invalidMapLink)).toBeVisible();
    await expect(view.map()).toHaveCount(0);
  });
});
