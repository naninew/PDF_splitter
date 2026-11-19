import { PDFDocument } from 'pdf-lib';

export interface PdfDocumentInfo {
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: Date;
}

/**
 * Loads a PDF ArrayBuffer or Uint8Array and extracts basic metadata
 */
export async function getPdfInfo(data: ArrayBuffer | Uint8Array | ArrayBufferLike): Promise<PdfDocumentInfo> {
  const doc = await PDFDocument.load(data as any, { ignoreEncryption: true });
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle(),
    author: doc.getAuthor(),
    creationDate: doc.getCreationDate(),
  };
}

/**
 * Extracts, reorders, and duplicates pages from a source PDF based on an array of 1-based page numbers.
 * @param sourceBytes Source PDF binary data (ArrayBuffer or Uint8Array)
 * @param pageNumbers Array of 1-based page numbers to extract in exact specified order (can include duplicates)
 * @returns Serialized Uint8Array of the newly assembled PDF
 */
export async function extractAndMergePdf(
  sourceBytes: ArrayBuffer | Uint8Array | ArrayBufferLike,
  pageNumbers: number[]
): Promise<Uint8Array> {
  if (pageNumbers.length === 0) {
    throw new Error('No pages selected for extraction.');
  }

  const srcDoc = await PDFDocument.load(sourceBytes as any, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  // Validate boundaries
  for (const p of pageNumbers) {
    if (p < 1 || p > totalPages) {
      throw new Error(`Page ${p} is out of bounds (document has ${totalPages} pages).`);
    }
  }

  const dstDoc = await PDFDocument.create();

  // Map 1-based page numbers to 0-based indices
  const zeroBasedIndices = pageNumbers.map((p) => p - 1);

  // Copy pages from srcDoc into dstDoc in the exact requested order
  // Note: copyPages in pdf-lib accepts an array of indices (including repeats)
  const copiedPages = await dstDoc.copyPages(srcDoc, zeroBasedIndices);

  for (const page of copiedPages) {
    dstDoc.addPage(page);
  }

  return await dstDoc.save();
}
