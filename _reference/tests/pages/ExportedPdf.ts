import { test, type Download } from '@playwright/test';
import { readFile } from 'node:fs/promises';

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * A PDF file the browser downloaded from Confluence's "Export to PDF".
 * Google map pictures are not compared; only the structure is read: the PDF header and the size of
 * embedded images. The app renders a map as an image of the macro's width x height in PDF exports
 * (templates staticRenderTemplates/mapPDF.vm and iframe-list-of-addresses-pdf.vm in the app).
 */
export class ExportedPdf {
  private constructor(readonly fileName: string, private readonly bytes: Buffer) {}

  static async from(download: Download): Promise<ExportedPdf> {
    return test.step('Read the downloaded PDF', async () => {
      const path = await download.path();
      return new ExportedPdf(download.suggestedFilename(), await readFile(path));
    });
  }

  /** True when the file starts with the PDF header "%PDF-". */
  isPdf(): boolean {
    return this.bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  }

  /**
   * Width and height of every image object (/Subtype /Image) in the file.
   * Confluence's PDF export writes object dictionaries uncompressed (no object streams; checked on
   * 8.5.31 and 9.2.26), so they can be read as text.
   */
  imageSizes(): ImageSize[] {
    const text = this.bytes.toString('latin1');
    const sizes: ImageSize[] = [];
    for (const m of text.matchAll(/\/Subtype\s*\/Image/g)) {
      const start = text.lastIndexOf('<<', m.index);
      const end = text.indexOf('>>', m.index);
      const dict = text.slice(start, end);
      const width = Number(/\/Width\s+(\d+)/.exec(dict)?.[1]);
      const height = Number(/\/Height\s+(\d+)/.exec(dict)?.[1]);
      sizes.push({ width, height });
    }
    return sizes;
  }
}
