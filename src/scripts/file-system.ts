/**
 * File System & Download Service
 * Supports:
 * - Output filename generator with editable suffix (default: _extracted)
 * - Filename sanitization
 * - File System Access API (showDirectoryPicker, showSaveFilePicker)
 * - Direct save to original source folder (leaving original file intact)
 * - Cross-browser fallback to standard download
 */

export interface SourceFolderContext {
  dirHandle: FileSystemDirectoryHandle;
  originalFileName: string;
}

export interface ScannedPdfItem {
  name: string;
  size: number;
  handle: FileSystemFileHandle;
}

export interface ScannedFolderResult {
  dirHandle: FileSystemDirectoryHandle;
  dirName: string;
  pdfFiles: ScannedPdfItem[];
}

/**
 * Sanitizes a filename to remove invalid filesystem characters
 */
export function sanitizeFilename(name: string): string {
  // Remove Windows / Unix forbidden characters: \ / : * ? " < > | and control characters
  return name.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_').trim();
}

/**
 * Computes the target output filename from original filename and suffix.
 * Example: "document.pdf", "_extracted" -> "document_extracted.pdf"
 * Example: "my.report.2026.pdf", "_v2" -> "my.report.2026_v2.pdf"
 */
export function generateOutputFilename(originalName: string, suffix: string = '_extracted'): string {
  const cleanOriginal = sanitizeFilename(originalName || 'document.pdf');
  const cleanSuffix = sanitizeFilename(suffix);

  const lastDotIndex = cleanOriginal.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const base = cleanOriginal.substring(0, lastDotIndex);
    const ext = cleanOriginal.substring(lastDotIndex);
    return `${base}${cleanSuffix}${ext}`;
  }

  return `${cleanOriginal}${cleanSuffix}.pdf`;
}

/**
 * Formats byte size into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Checks if the File System Access API is supported in the current browser
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

/**
 * Checks if directory picker is supported
 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Checks if save file picker is supported
 */
export function isSaveFilePickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/**
 * Downloads a Uint8Array via traditional browser Blob URL & <a> download
 */
export function downloadViaBlob(data: Uint8Array, fileName: string): void {
  const blob = new Blob([data as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Saves a Uint8Array using the browser's native Save File Picker dialog
 */
export async function saveViaFilePicker(data: Uint8Array, suggestedName: string): Promise<boolean> {
  if (!isSaveFilePickerSupported()) {
    downloadViaBlob(data, suggestedName);
    return true;
  }

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'PDF Document',
          accept: {
            'application/pdf': ['.pdf'],
          },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return false;
    }
    downloadViaBlob(data, suggestedName);
    return true;
  }
}

/**
 * Saves a Uint8Array directly into a previously opened directory handle.
 * Leaves the original file intact, creates the new extracted file alongside it.
 */
export async function saveDirectlyToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  targetFileName: string,
  data: Uint8Array
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(targetFileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * Opens a folder picker, lists all PDF files inside that folder,
 * returning the list and dirHandle so the user can select which PDF to open.
 */
export async function scanFolderForPdfs(): Promise<ScannedFolderResult | null> {
  if (!isDirectoryPickerSupported()) {
    throw new Error('Folder access is not supported in this browser. Please use the standard file picker.');
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    });

    const pdfFiles: ScannedPdfItem[] = [];

    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
        try {
          const file = await entry.getFile();
          pdfFiles.push({
            name: entry.name,
            size: file.size,
            handle: entry,
          });
        } catch {
          pdfFiles.push({
            name: entry.name,
            size: 0,
            handle: entry,
          });
        }
      }
    }

    pdfFiles.sort((a, b) => a.name.localeCompare(b.name));

    return {
      dirHandle,
      dirName: dirHandle.name || 'Selected Folder',
      pdfFiles,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}
