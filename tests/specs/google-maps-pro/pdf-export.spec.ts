// PDF export of pages with the app's macros.
// Why E2E: the app has separate PDF render templates that only run inside Confluence's PDF export;
// unit tests of the app code do not run the export.
import { test, expect } from '../../fixtures/index.js';
import { ExportedPdf } from '../../pages/ExportedPdf.js';
import { GoogleMapsMacroDialog } from '../../pages/GoogleMapsMacroDialog.js';
import { GoogleMapsMacroView } from '../../pages/GoogleMapsMacroView.js';
import { ListOfAddressesMacroEditor, ListOfAddressesMacroView } from '../../pages/ListOfAddressesMacro.js';
import { ADDRESSES, APP, LIST_MACRO } from './data.js';

/** Default macro size; the PDF shows the map as an image of this size. */
const DEFAULT_SIZE = { width: 600, height: 400 };

test.describe('Embed Google Maps Pro: PDF export', () => {
  test('page with a Google Maps macro exports with the map image', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const dialog = new GoogleMapsMacroDialog(page, adapter);
    const view = new GoogleMapsMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, APP.macroTitle, APP.macroKey);
    await dialog.setLocation(ADDRESSES.secondary);
    await dialog.confirm();
    await adapter.publishPage(page);
    await expect(view.map()).toBeVisible();

    const pdf = await ExportedPdf.from(await adapter.exportPageToPdf(page, emptyPageId));

    expect(pdf.isPdf(), `${pdf.fileName} is a PDF`).toBe(true);
    expect(pdf.imageSizes()).toContainEqual(DEFAULT_SIZE);
  });

  test('page with a List of Addresses macro exports with the map image', { tag: '@full' }, async ({ page, adapter, emptyPageId }) => {
    const editor = new ListOfAddressesMacroEditor(page, adapter);
    const view = new ListOfAddressesMacroView(page, adapter);

    await adapter.openPageEditor(page, emptyPageId);
    await adapter.insertMacroFromBrowser(page, LIST_MACRO.title, LIST_MACRO.key);
    await editor.confirm();
    await editor.enterAddresses([ADDRESSES.secondary, ADDRESSES.primary]);
    await adapter.publishPage(page);
    await expect(view.map()).toBeVisible();

    const pdf = await ExportedPdf.from(await adapter.exportPageToPdf(page, emptyPageId));

    expect(pdf.isPdf(), `${pdf.fileName} is a PDF`).toBe(true);
    expect(pdf.imageSizes()).toContainEqual(DEFAULT_SIZE);
  });
});
