import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up PDF.js worker via Vite's asset URL resolver
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PageRenderResult {
  width: number;
  height: number;
}

export class PdfPreviewService {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private thumbnailCache = new Map<number, string>();
  private activeRenderTasks = new Map<HTMLCanvasElement, any>();
  private observer: IntersectionObserver | null = null;

  /**
   * Loads a PDF ArrayBuffer into PDF.js.
   * Clones data.slice(0) so the caller's ArrayBuffer is NEVER detached.
   */
  async loadDocument(data: ArrayBuffer): Promise<number> {
    this.cleanup();
    // Clone buffer so worker transfer cannot detach original
    const clonedData = data.slice(0);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(clonedData),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });
    this.pdfDoc = await loadingTask.promise;
    return this.pdfDoc.numPages;
  }

  /**
   * Renders a specific 1-based page of the loaded document to a canvas
   */
  async renderPage(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.0
  ): Promise<PageRenderResult> {
    if (!this.pdfDoc) {
      throw new Error('No PDF document loaded for preview.');
    }

    // Cancel existing task for this canvas if any
    const existingTask = this.activeRenderTasks.get(canvas);
    if (existingTask) {
      try {
        existingTask.cancel();
      } catch {}
      this.activeRenderTasks.delete(canvas);
    }

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas.');
    }

    // Adjust canvas resolution for crisp HiDPI displays
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

    const renderContext = {
      canvasContext: ctx,
      viewport,
      transform,
    };

    const task = page.render(renderContext);
    this.activeRenderTasks.set(canvas, task);

    try {
      await task.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        return { width: viewport.width, height: viewport.height };
      }
      throw err;
    } finally {
      this.activeRenderTasks.delete(canvas);
    }

    return { width: viewport.width, height: viewport.height };
  }

  /**
   * Mounts a continuous vertical scroll view of the output page sequence
   * into a scrollable container. Uses IntersectionObserver for lazy on-demand rendering.
   */
  renderContinuousDocument(
    outputPages: number[],
    container: HTMLElement,
    zoom: number = 1.0
  ): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Cancel all active tasks
    this.activeRenderTasks.forEach((task) => {
      try {
        task.cancel();
      } catch {}
    });
    this.activeRenderTasks.clear();

    container.innerHTML = '';

    if (outputPages.length === 0 || !this.pdfDoc) {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'continuous-empty-notice';
      emptyNotice.textContent = 'No pages selected. Choose pages from the organizer to preview.';
      container.appendChild(emptyNotice);
      return;
    }

    const renderedCanvases = new Set<HTMLCanvasElement>();

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const canvas = card.querySelector<HTMLCanvasElement>('canvas');
            const pageNum = parseInt(card.dataset.pageNum || '1', 10);

            if (canvas && !renderedCanvases.has(canvas)) {
              renderedCanvases.add(canvas);
              this.renderPage(pageNum, canvas, zoom).catch((err) => {
                console.warn('Continuous page render error:', err);
              });
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '250px 0px', // Pre-render 250px before entering viewport
        threshold: 0.01,
      }
    );

    outputPages.forEach((pageNum, index) => {
      const card = document.createElement('div');
      card.className = 'continuous-page-card';
      card.dataset.pageNum = pageNum.toString();
      card.dataset.outputIndex = index.toString();

      const header = document.createElement('div');
      header.className = 'continuous-page-header';
      header.textContent = `Page ${index + 1} of ${outputPages.length} (Original Pg ${pageNum})`;

      const canvasWrapper = document.createElement('div');
      canvasWrapper.className = 'continuous-canvas-wrapper';

      const canvas = document.createElement('canvas');
      canvas.className = 'continuous-page-canvas';
      canvasWrapper.appendChild(canvas);

      card.appendChild(header);
      card.appendChild(canvasWrapper);
      container.appendChild(card);

      this.observer!.observe(card);
    });
  }

  /**
   * Generates a thumbnail data URL for a given 1-based page number
   */
  async getThumbnailDataUrl(pageNumber: number, maxWidth: number = 140): Promise<string> {
    if (this.thumbnailCache.has(pageNumber)) {
      return this.thumbnailCache.get(pageNumber)!;
    }

    if (!this.pdfDoc) {
      throw new Error('No PDF document loaded.');
    }

    const page = await this.pdfDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = maxWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = viewport.width;
    offscreenCanvas.height = viewport.height;
    const ctx = offscreenCanvas.getContext('2d');

    if (!ctx) {
      return '';
    }

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.8);
    this.thumbnailCache.set(pageNumber, dataUrl);
    return dataUrl;
  }

  /**
   * Clean up loaded resources
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.activeRenderTasks.forEach((task) => {
      try {
        task.cancel();
      } catch {}
    });
    this.activeRenderTasks.clear();
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.thumbnailCache.clear();
  }
}
