import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import { extractAndMergePdf, getPdfInfo } from '../scripts/pdf-service';

describe('PDF Service: Extraction & Merging', () => {
  // Helper to create a dummy 3-page PDF in memory
  async function createTestPdf(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 3; i++) {
      const page = doc.addPage([300, 400]);
      page.drawText(`Page ${i}`, {
        x: 50,
        y: 350,
        size: 24,
        color: rgb(0, 0, 0),
      });
    }
    return await doc.save();
  }

  it('reads metadata correctly from test PDF', async () => {
    const testBytes = await createTestPdf();
    const info = await getPdfInfo(testBytes.buffer);
    expect(info.pageCount).toBe(3);
  });

  it('extracts reordered pages correctly (e.g. 3, 1, 2)', async () => {
    const testBytes = await createTestPdf();
    const resultBytes = await extractAndMergePdf(testBytes, [3, 1, 2]);
    const resultDoc = await PDFDocument.load(resultBytes);
    expect(resultDoc.getPageCount()).toBe(3);
  });

  it('extracts repeated pages correctly (e.g. 1, 3, 1, 2, 3)', async () => {
    const testBytes = await createTestPdf();
    const resultBytes = await extractAndMergePdf(testBytes, [1, 3, 1, 2, 3]);
    const resultDoc = await PDFDocument.load(resultBytes);
    expect(resultDoc.getPageCount()).toBe(5);
  });

  it('throws an error if out of bounds page is requested', async () => {
    const testBytes = await createTestPdf();
    await expect(extractAndMergePdf(testBytes, [1, 4])).rejects.toThrow(
      'Page 4 is out of bounds'
    );
  });

  it('throws an error if page list is empty', async () => {
    const testBytes = await createTestPdf();
    await expect(extractAndMergePdf(testBytes, [])).rejects.toThrow(
      'No pages selected for extraction.'
    );
  });

  it('safely extracts from independent sliced buffer copies without detachment errors', async () => {
    const testBytes = await createTestPdf();
    const copy1 = testBytes.buffer.slice(0);
    const copy2 = testBytes.buffer.slice(0);
    
    // First extraction on copy1
    const res1 = await extractAndMergePdf(copy1, [1, 2]);
    expect((await PDFDocument.load(res1)).getPageCount()).toBe(2);

    // Second extraction on copy2
    const res2 = await extractAndMergePdf(copy2, [2, 3, 1]);
    expect((await PDFDocument.load(res2)).getPageCount()).toBe(3);
  });
});
