import { ICONS } from './icons';
import { getPdfInfo, extractAndMergePdf } from './pdf-service';
import { PdfPreviewService } from './preview-service';
import {
  generateOutputFilename,
  formatBytes,
  downloadViaBlob,
  saveViaFilePicker,
  saveDirectlyToDirectory,
  scanFolderForPdfs,
  isDirectoryPickerSupported,
  ScannedFolderResult,
} from './file-system';
import {
  addRangePages,
  incrementPageCount,
  decrementPageCount,
  togglePageSelection,
  reorderPage,
  removePageAtIndex,
  getAllPagesList,
  getOddPagesList,
  getEvenPagesList,
  invertPagesList,
} from './page-selection';

// Application State
interface AppState {
  currentFile: File | null;
  totalPages: number;
  selectedPages: number[]; // Ordered array of 1-based page numbers (e.g. [2, 3, 4, 5, 15, 15])
  currentZoom: number;
  activeTab: 'tabOrganizer' | 'tabDocPreview';
  dirHandle: FileSystemDirectoryHandle | null;
  suffix: string;
}

const state: AppState = {
  currentFile: null,
  totalPages: 0,
  selectedPages: [],
  currentZoom: 1.0,
  activeTab: 'tabOrganizer',
  dirHandle: null,
  suffix: '_extracted',
};

const previewService = new PdfPreviewService();

// DOM Element References
const elements = {
  // Header
  brandIcon: document.getElementById('brandIcon')!,
  btnReset: document.getElementById('btnReset') as HTMLButtonElement,
  resetIcon: document.getElementById('resetIcon')!,

  // Upload
  uploadSection: document.getElementById('uploadSection')!,
  dropzone: document.getElementById('dropzone')!,
  fileInput: document.getElementById('fileInput') as HTMLInputElement,
  dropzoneIcon: document.getElementById('dropzoneIcon')!,
  btnBrowseFile: document.getElementById('btnBrowseFile') as HTMLButtonElement,
  browseFileIcon: document.getElementById('browseFileIcon')!,
  btnOpenFolder: document.getElementById('btnOpenFolder') as HTMLButtonElement,
  openFolderIcon: document.getElementById('openFolderIcon')!,

  // File Card
  fileInfoCard: document.getElementById('fileInfoCard')!,
  docCardIcon: document.getElementById('docCardIcon')!,
  docFileName: document.getElementById('docFileName')!,
  docFileMeta: document.getElementById('docFileMeta')!,
  btnChangePdf: document.getElementById('btnChangePdf') as HTMLButtonElement,
  changePdfIcon: document.getElementById('changePdfIcon')!,
  btnCloseFile: document.getElementById('btnCloseFile') as HTMLButtonElement,
  closeFileIcon: document.getElementById('closeFileIcon')!,

  // Visual Page Selection
  rangeSection: document.getElementById('rangeSection')!,
  rangeCountSummary: document.getElementById('rangeCountSummary')!,
  rangeStartSelect: document.getElementById('rangeStartSelect') as HTMLSelectElement,
  rangeEndSelect: document.getElementById('rangeEndSelect') as HTMLSelectElement,
  btnAddVisualRange: document.getElementById('btnAddVisualRange') as HTMLButtonElement,
  addRangeIcon: document.getElementById('addRangeIcon')!,

  // Presets
  chipAllPages: document.getElementById('chipAllPages') as HTMLButtonElement,
  chipClear: document.getElementById('chipClear') as HTMLButtonElement,
  chipOddPages: document.getElementById('chipOddPages') as HTMLButtonElement,
  chipEvenPages: document.getElementById('chipEvenPages') as HTMLButtonElement,
  chipInvert: document.getElementById('chipInvert') as HTMLButtonElement,

  // Badges & Tray
  badgeTotalOutput: document.getElementById('badgeTotalOutput')!,
  badgeDuplicates: document.getElementById('badgeDuplicates')!,
  selectedPagesTray: document.getElementById('selectedPagesTray')!,

  // Filename
  filenameSection: document.getElementById('filenameSection')!,
  suffixInput: document.getElementById('suffixInput') as HTMLInputElement,
  previewTargetFilename: document.getElementById('previewTargetFilename')!,

  // Export
  exportSection: document.getElementById('exportSection')!,
  btnExportMain: document.getElementById('btnExportMain') as HTMLButtonElement,
  exportMainIcon: document.getElementById('exportMainIcon')!,
  exportMainText: document.getElementById('exportMainText')!,
  btnExportMenuTrigger: document.getElementById('btnExportMenuTrigger') as HTMLButtonElement,
  exportMoreIcon: document.getElementById('exportMoreIcon')!,
  exportDropdownMenu: document.getElementById('exportDropdownMenu')!,
  menuItemDirectDownload: document.getElementById('menuItemDirectDownload') as HTMLButtonElement,
  menuDownloadIcon: document.getElementById('menuDownloadIcon')!,
  menuItemSaveAs: document.getElementById('menuItemSaveAs') as HTMLButtonElement,
  menuSaveAsIcon: document.getElementById('menuSaveAsIcon')!,
  menuItemSaveOriginalFolder: document.getElementById('menuItemSaveOriginalFolder') as HTMLButtonElement,
  menuSaveFolderIcon: document.getElementById('menuSaveFolderIcon')!,

  // Preview Tabs & Panes
  tabGridIcon: document.getElementById('tabGridIcon')!,
  tabDocPreviewIcon: document.getElementById('tabDocPreviewIcon')!,
  tabs: document.querySelectorAll<HTMLButtonElement>('.preview-tab'),
  tabPanes: document.querySelectorAll<HTMLElement>('.tab-pane'),
  emptyState: document.getElementById('emptyState')!,
  emptyDocIcon: document.getElementById('emptyDocIcon')!,

  // Toolbar
  docPreviewToolbar: document.getElementById('docPreviewToolbar')!,
  btnZoomOut: document.getElementById('btnZoomOut') as HTMLButtonElement,
  zoomOutIcon: document.getElementById('zoomOutIcon')!,
  btnZoomIn: document.getElementById('btnZoomIn') as HTMLButtonElement,
  zoomInIcon: document.getElementById('zoomInIcon')!,
  btnZoomReset: document.getElementById('btnZoomReset') as HTMLButtonElement,
  zoomResetIcon: document.getElementById('zoomResetIcon')!,
  zoomIndicator: document.getElementById('zoomIndicator')!,

  // Preview Elements
  tabOrganizer: document.getElementById('tabOrganizer')!,
  tabDocPreview: document.getElementById('tabDocPreview')!,
  thumbnailsGrid: document.getElementById('thumbnailsGrid')!,
  continuousPreviewContainer: document.getElementById('continuousPreviewContainer')!,

  // Folder PDF Selector Modal
  folderModal: document.getElementById('folderModal')!,
  folderModalTitle: document.getElementById('folderModalTitle')!,
  folderModalSubtitle: document.getElementById('folderModalSubtitle')!,
  folderModalFileList: document.getElementById('folderModalFileList')!,
  btnCloseFolderModal: document.getElementById('btnCloseFolderModal') as HTMLButtonElement,
  closeFolderModalIcon: document.getElementById('closeFolderModalIcon')!,
  btnChooseAnotherFolder: document.getElementById('btnChooseAnotherFolder') as HTMLButtonElement,
  btnCancelFolderModal: document.getElementById('btnCancelFolderModal') as HTMLButtonElement,

  // Toast
  toastNotice: document.getElementById('toastNotice')!,
  toastIcon: document.getElementById('toastIcon')!,
  toastMessage: document.getElementById('toastMessage')!,
};

/**
 * Initialize SVG icons throughout the interface (STRICTLY NO EMOJIS)
 */
function initIcons() {
  elements.brandIcon.innerHTML = ICONS.filePdf;
  elements.resetIcon.innerHTML = ICONS.refresh;
  elements.dropzoneIcon.innerHTML = ICONS.upload;
  elements.browseFileIcon.innerHTML = ICONS.filePdf;
  elements.openFolderIcon.innerHTML = ICONS.folder;
  elements.docCardIcon.innerHTML = ICONS.filePdf;
  elements.changePdfIcon.innerHTML = ICONS.refresh;
  elements.closeFileIcon.innerHTML = ICONS.clear;
  elements.addRangeIcon.innerHTML = ICONS.plus;
  elements.exportMainIcon.innerHTML = ICONS.download;
  elements.exportMoreIcon.innerHTML = ICONS.moreVertical; // Vertical 3 dots (⋮)
  elements.menuDownloadIcon.innerHTML = ICONS.download;
  elements.menuSaveAsIcon.innerHTML = ICONS.save;
  elements.menuSaveFolderIcon.innerHTML = ICONS.folder;
  elements.tabGridIcon.innerHTML = ICONS.grid;
  elements.tabDocPreviewIcon.innerHTML = ICONS.preview;
  elements.emptyDocIcon.innerHTML = ICONS.filePdf;
  elements.zoomOutIcon.innerHTML = ICONS.zoomOut;
  elements.zoomInIcon.innerHTML = ICONS.zoomIn;
  elements.zoomResetIcon.innerHTML = ICONS.refresh;
  elements.closeFolderModalIcon.innerHTML = ICONS.clear;
  elements.toastIcon.innerHTML = ICONS.check;

  if (!isDirectoryPickerSupported()) {
    elements.btnOpenFolder.style.display = 'none';
  }
}

/**
 * Shows a toast notice
 */
function showToast(message: string, isError = false) {
  elements.toastMessage.textContent = message;
  elements.toastIcon.innerHTML = isError ? ICONS.alert : ICONS.check;
  elements.toastNotice.classList.add('show');
  setTimeout(() => {
    elements.toastNotice.classList.remove('show');
  }, 3200);
}

/**
 * Updates output filename preview
 */
function updateFilenamePreview() {
  if (!state.currentFile) return;
  const target = generateOutputFilename(state.currentFile.name, state.suffix);
  elements.previewTargetFilename.textContent = target;
}

/**
 * Populates From / To range dropdown selects
 */
function populateRangeSelects(totalPages: number) {
  elements.rangeStartSelect.innerHTML = '';
  elements.rangeEndSelect.innerHTML = '';

  for (let p = 1; p <= totalPages; p++) {
    const optStart = document.createElement('option');
    optStart.value = p.toString();
    optStart.textContent = `Page ${p}`;
    elements.rangeStartSelect.appendChild(optStart);

    const optEnd = document.createElement('option');
    optEnd.value = p.toString();
    optEnd.textContent = `Page ${p}`;
    elements.rangeEndSelect.appendChild(optEnd);
  }

  elements.rangeStartSelect.value = '1';
  elements.rangeEndSelect.value = totalPages.toString();
}

/**
 * Handles newly loaded PDF file data
 */
async function loadPdfFile(file: File, dirHandle: FileSystemDirectoryHandle | null = null) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Use safe slice for reading metadata
    const info = await getPdfInfo(arrayBuffer.slice(0));

    if (info.pageCount <= 0) {
      showToast('The selected PDF has no pages.', true);
      return;
    }

    state.currentFile = file;
    state.totalPages = info.pageCount;
    state.dirHandle = dirHandle;

    // Load into preview service with safe cloned buffer (prevents worker buffer detachment)
    await previewService.loadDocument(arrayBuffer.slice(0));

    // Update UI elements
    elements.docFileName.textContent = file.name;
    elements.docFileName.title = file.name;
    elements.docFileMeta.textContent = `${formatBytes(file.size)} - ${info.pageCount} ${info.pageCount === 1 ? 'page' : 'pages'}`;

    elements.uploadSection.style.display = 'none';
    elements.fileInfoCard.style.display = 'flex';
    elements.rangeSection.style.display = 'flex';
    elements.filenameSection.style.display = 'flex';
    elements.exportSection.style.display = 'flex';
    elements.btnReset.style.display = 'inline-flex';
    elements.emptyState.style.display = 'none';

    // Populate Range Adder dropdowns
    populateRangeSelects(info.pageCount);

    // Show folder option if dirHandle is active
    if (dirHandle) {
      elements.menuItemSaveOriginalFolder.style.display = 'flex';
      elements.exportMainText.textContent = 'Save to Original Folder';
    } else {
      elements.menuItemSaveOriginalFolder.style.display = 'none';
      elements.exportMainText.textContent = 'Export PDF';
    }

    // Default selection: all pages 1..N
    state.selectedPages = getAllPagesList(info.pageCount);
    state.suffix = elements.suffixInput.value || '_extracted';

    updateFilenamePreview();
    updateSelectionState();

    // Render organizer thumbnail grid
    renderOrganizerGrid();

    // Default view: Page Organizer
    switchTab('tabOrganizer');

    showToast(`Loaded "${file.name}" (${info.pageCount} pages).`);
  } catch (err: any) {
    showToast(`Failed to parse PDF: ${err.message || err}`, true);
  }
}

/**
 * Opens Folder Picker and displays modal with all found PDF files
 */
async function handleOpenFolder() {
  try {
    const result: ScannedFolderResult | null = await scanFolderForPdfs();
    if (!result) return; // User cancelled OS dialog

    displayFolderPdfModal(result);
  } catch (err: any) {
    showToast(err.message || 'Failed to open folder.', true);
  }
}

/**
 * Displays the modal listing all PDF files found in the folder
 */
function displayFolderPdfModal(result: ScannedFolderResult) {
  elements.folderModalTitle.textContent = `Folder: ${result.dirName}`;
  elements.folderModalSubtitle.textContent = result.pdfFiles.length === 1
    ? '1 PDF document found in this folder:'
    : `${result.pdfFiles.length} PDF documents found in this folder:`;

  elements.folderModalFileList.innerHTML = '';

  if (result.pdfFiles.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'modal-empty';
    emptyMsg.textContent = 'No PDF files found in this folder. Please choose another folder or use "Select PDF".';
    elements.folderModalFileList.appendChild(emptyMsg);
  } else {
    result.pdfFiles.forEach((pdf) => {
      const item = document.createElement('div');
      item.className = 'pdf-list-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'pdf-list-info';
      infoDiv.innerHTML = `${ICONS.filePdf}<div><div class="pdf-list-name" title="${pdf.name}">${pdf.name}</div><div class="pdf-list-size">${formatBytes(pdf.size)}</div></div>`;

      const btnOpen = document.createElement('button');
      btnOpen.className = 'btn btn-primary btn-sm';
      btnOpen.textContent = 'Select';

      const selectThisFile = async () => {
        try {
          const file = await pdf.handle.getFile();
          elements.folderModal.style.display = 'none';
          loadPdfFile(file, result.dirHandle);
        } catch (err: any) {
          showToast(`Error opening file: ${err.message || err}`, true);
        }
      };

      item.addEventListener('click', selectThisFile);
      btnOpen.addEventListener('click', (e) => {
        e.stopPropagation();
        selectThisFile();
      });

      item.appendChild(infoDiv);
      item.appendChild(btnOpen);
      elements.folderModalFileList.appendChild(item);
    });
  }

  elements.folderModal.style.display = 'flex';
}

/**
 * Updates selection counters, badges, tray, thumbnail highlights, and preview
 */
function updateSelectionState() {
  const count = state.selectedPages.length;
  elements.rangeCountSummary.textContent = `${count} ${count === 1 ? 'page' : 'pages'}`;
  elements.badgeTotalOutput.textContent = `Output: ${count} ${count === 1 ? 'page' : 'pages'}`;

  // Calculate duplicates
  const counts = new Map<number, number>();
  for (const p of state.selectedPages) {
    counts.set(p, (counts.get(p) || 0) + 1);
  }

  let dupCount = 0;
  counts.forEach((qty) => {
    if (qty > 1) dupCount += qty - 1;
  });

  if (dupCount > 0) {
    elements.badgeDuplicates.style.display = 'inline-flex';
    elements.badgeDuplicates.textContent = `${dupCount} duplicate page${dupCount > 1 ? 's' : ''}`;
  } else {
    elements.badgeDuplicates.style.display = 'none';
  }

  elements.btnExportMain.disabled = count === 0;
  elements.btnExportMenuTrigger.disabled = count === 0;

  renderSelectedTray();
  updateGridCardStates();

  if (state.activeTab === 'tabDocPreview') {
    previewService.renderContinuousDocument(
      state.selectedPages,
      elements.continuousPreviewContainer,
      state.currentZoom
    );
  }
}

/**
 * Renders the Selected Pages Tray (Queue with reorder and remove)
 */
function renderSelectedTray() {
  elements.selectedPagesTray.innerHTML = '';

  if (state.selectedPages.length === 0) {
    const emptyHint = document.createElement('div');
    emptyHint.className = 'tray-empty-hint';
    emptyHint.textContent = 'No pages selected. Use the range tool or click pages on the grid.';
    elements.selectedPagesTray.appendChild(emptyHint);
    return;
  }

  state.selectedPages.forEach((pageNum, index) => {
    const item = document.createElement('div');
    item.className = 'tray-item';

    const label = document.createElement('span');
    label.className = 'tray-item-label';
    label.textContent = `Pg ${pageNum}`;

    // Left move button
    const btnLeft = document.createElement('button');
    btnLeft.className = 'tray-item-btn';
    btnLeft.title = 'Move left';
    btnLeft.innerHTML = ICONS.moveLeft;
    btnLeft.disabled = index === 0;
    btnLeft.addEventListener('click', () => {
      state.selectedPages = reorderPage(state.selectedPages, index, 'left');
      updateSelectionState();
    });

    // Right move button
    const btnRight = document.createElement('button');
    btnRight.className = 'tray-item-btn';
    btnRight.title = 'Move right';
    btnRight.innerHTML = ICONS.moveRight;
    btnRight.disabled = index === state.selectedPages.length - 1;
    btnRight.addEventListener('click', () => {
      state.selectedPages = reorderPage(state.selectedPages, index, 'right');
      updateSelectionState();
    });

    // Remove button
    const btnRemove = document.createElement('button');
    btnRemove.className = 'tray-item-btn btn-remove';
    btnRemove.title = 'Remove this page';
    btnRemove.innerHTML = ICONS.clear;
    btnRemove.addEventListener('click', () => {
      state.selectedPages = removePageAtIndex(state.selectedPages, index);
      updateSelectionState();
    });

    item.appendChild(btnLeft);
    item.appendChild(label);
    item.appendChild(btnRight);
    item.appendChild(btnRemove);

    elements.selectedPagesTray.appendChild(item);
  });
}

/**
 * Renders thumbnail gallery for original source pages with [-] [xN] [+] steppers
 */
function renderOrganizerGrid() {
  elements.thumbnailsGrid.innerHTML = '';
  if (!state.totalPages) return;

  for (let p = 1; p <= state.totalPages; p++) {
    const card = document.createElement('div');
    card.className = 'thumbnail-card';
    card.dataset.page = p.toString();

    // Card Header (Page number and check icon)
    const header = document.createElement('div');
    header.className = 'thumbnail-card-header';

    const pageTitle = document.createElement('span');
    pageTitle.textContent = `Page ${p}`;

    const checkIcon = document.createElement('span');
    checkIcon.className = 'thumbnail-check-icon';
    checkIcon.innerHTML = ICONS.check;

    header.appendChild(pageTitle);
    header.appendChild(checkIcon);

    // Thumbnail Preview (Clicking toggles 0 <-> 1)
    const previewDiv = document.createElement('div');
    previewDiv.className = 'thumbnail-preview';
    previewDiv.title = `Click to toggle Page ${p}`;

    const img = document.createElement('img');
    img.alt = `Page ${p}`;
    previewDiv.appendChild(img);

    previewDiv.addEventListener('click', () => {
      state.selectedPages = togglePageSelection(state.selectedPages, p);
      updateSelectionState();
    });

    // Stepper Controls ([-] [Count] [+])
    const stepper = document.createElement('div');
    stepper.className = 'thumbnail-stepper';

    const btnMinus = document.createElement('button');
    btnMinus.className = 'stepper-btn btn-minus';
    btnMinus.title = 'Reduce count or remove';
    btnMinus.innerHTML = ICONS.minus;
    btnMinus.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedPages = decrementPageCount(state.selectedPages, p);
      updateSelectionState();
    });

    const countLabel = document.createElement('span');
    countLabel.className = 'stepper-count';
    countLabel.textContent = '0';

    const btnPlus = document.createElement('button');
    btnPlus.className = 'stepper-btn btn-plus';
    btnPlus.title = 'Add duplicate page';
    btnPlus.innerHTML = ICONS.plus;
    btnPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedPages = incrementPageCount(state.selectedPages, p);
      updateSelectionState();
    });

    stepper.appendChild(btnMinus);
    stepper.appendChild(countLabel);
    stepper.appendChild(btnPlus);

    card.appendChild(header);
    card.appendChild(previewDiv);
    card.appendChild(stepper);

    elements.thumbnailsGrid.appendChild(card);

    // Asynchronously load thumbnail image data URL
    previewService.getThumbnailDataUrl(p, 140).then((url) => {
      img.src = url;
    });
  }

  updateGridCardStates();
}

/**
 * Updates selected classes and stepper numbers on all thumbnail cards
 */
function updateGridCardStates() {
  const counts = new Map<number, number>();
  for (const p of state.selectedPages) {
    counts.set(p, (counts.get(p) || 0) + 1);
  }

  const cards = elements.thumbnailsGrid.querySelectorAll<HTMLElement>('.thumbnail-card');
  cards.forEach((card) => {
    const pageNum = parseInt(card.dataset.page || '0', 10);
    const count = counts.get(pageNum) || 0;

    const countLabel = card.querySelector<HTMLElement>('.stepper-count')!;
    const btnMinus = card.querySelector<HTMLButtonElement>('.btn-minus')!;

    if (count > 0) {
      card.classList.add('selected');
      countLabel.textContent = `x${count}`;
      btnMinus.disabled = false;
    } else {
      card.classList.remove('selected');
      countLabel.textContent = '0';
      btnMinus.disabled = true;
    }
  });
}

/**
 * Switches between Page Organizer and Continuous Document Preview tabs
 */
function switchTab(tabId: 'tabOrganizer' | 'tabDocPreview') {
  state.activeTab = tabId;

  elements.tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  elements.tabPanes.forEach((pane) => {
    pane.classList.toggle('active', pane.id === tabId);
    pane.style.display = pane.id === tabId ? 'flex' : 'none';
  });

  elements.docPreviewToolbar.style.display = tabId === 'tabDocPreview' ? 'flex' : 'none';

  if (tabId === 'tabDocPreview') {
    previewService.renderContinuousDocument(
      state.selectedPages,
      elements.continuousPreviewContainer,
      state.currentZoom
    );
  }
}

/**
 * Performs PDF assembly and export via chosen mechanism.
 * Reads fresh ArrayBuffer directly from state.currentFile to avoid detached buffer issues.
 */
async function performExport(exportMode: 'default' | 'direct' | 'saveAs' | 'folder') {
  if (!state.currentFile || state.selectedPages.length === 0) {
    showToast('Please select at least one page before exporting.', true);
    return;
  }

  const targetFilename = generateOutputFilename(state.currentFile.name, state.suffix);
  elements.btnExportMain.disabled = true;
  elements.btnExportMain.textContent = 'Generating...';

  try {
    const freshArrayBuffer = await state.currentFile.arrayBuffer();

    const outputBytes = await extractAndMergePdf(
      freshArrayBuffer,
      state.selectedPages
    );

    if (exportMode === 'folder' || (exportMode === 'default' && state.dirHandle)) {
      if (state.dirHandle) {
        await saveDirectlyToDirectory(state.dirHandle, targetFilename, outputBytes);
        showToast(`Saved "${targetFilename}" directly to original folder.`);
      } else {
        await saveViaFilePicker(outputBytes, targetFilename);
        showToast(`Exported "${targetFilename}".`);
      }
    } else if (exportMode === 'saveAs') {
      const saved = await saveViaFilePicker(outputBytes, targetFilename);
      if (saved) {
        showToast(`Exported "${targetFilename}".`);
      }
    } else {
      downloadViaBlob(outputBytes, targetFilename);
      showToast(`Downloaded "${targetFilename}".`);
    }
  } catch (err: any) {
    console.error('Export error:', err);
    showToast(`Export failed: ${err.message || err}`, true);
  } finally {
    elements.btnExportMain.disabled = false;
    elements.btnExportMain.textContent = state.dirHandle
      ? 'Save to Original Folder'
      : 'Export PDF';
  }
}

/**
 * Resets application to initial state
 */
function resetApp() {
  previewService.cleanup();
  state.currentFile = null;
  state.totalPages = 0;
  state.selectedPages = [];
  state.dirHandle = null;

  elements.fileInput.value = '';
  elements.uploadSection.style.display = 'block';
  elements.fileInfoCard.style.display = 'none';
  elements.rangeSection.style.display = 'none';
  elements.filenameSection.style.display = 'none';
  elements.exportSection.style.display = 'none';
  elements.btnReset.style.display = 'none';
  elements.emptyState.style.display = 'flex';
  elements.docPreviewToolbar.style.display = 'none';

  elements.tabPanes.forEach((pane) => (pane.style.display = 'none'));
  elements.thumbnailsGrid.innerHTML = '';
  elements.selectedPagesTray.innerHTML = '';
  elements.continuousPreviewContainer.innerHTML = '';
  elements.folderModal.style.display = 'none';
}

// Event Listeners Setup
function setupEventListeners() {
  // Reset and Deselect buttons
  elements.btnReset.addEventListener('click', () => {
    resetApp();
    showToast('Document reset. Ready for a new PDF.');
  });

  elements.btnCloseFile.addEventListener('click', () => {
    resetApp();
    showToast('Document deselected.');
  });

  // Change PDF button (directly opens file picker to choose another document)
  elements.btnChangePdf.addEventListener('click', () => {
    elements.fileInput.click();
  });

  // File Upload via Button
  elements.btnBrowseFile.addEventListener('click', () => {
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      loadPdfFile(target.files[0]);
    }
  });

  // Open from Folder via Directory Picker
  elements.btnOpenFolder.addEventListener('click', handleOpenFolder);

  // Folder Modal Buttons
  elements.btnCloseFolderModal.addEventListener('click', () => {
    elements.folderModal.style.display = 'none';
  });

  elements.btnCancelFolderModal.addEventListener('click', () => {
    elements.folderModal.style.display = 'none';
  });

  elements.btnChooseAnotherFolder.addEventListener('click', () => {
    elements.folderModal.style.display = 'none';
    handleOpenFolder();
  });

  // Drag and Drop
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
  });

  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });

  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        loadPdfFile(file);
      } else {
        showToast('Please upload a valid PDF file.', true);
      }
    }
  });

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // Visual Range Adder Button
  elements.btnAddVisualRange.addEventListener('click', () => {
    const start = parseInt(elements.rangeStartSelect.value, 10);
    const end = parseInt(elements.rangeEndSelect.value, 10);
    if (!isNaN(start) && !isNaN(end)) {
      state.selectedPages = addRangePages(state.selectedPages, start, end, state.totalPages);
      updateSelectionState();
      showToast(`Added Pages ${start} to ${end}.`);
    }
  });

  // Quick Preset Chips
  elements.chipAllPages.addEventListener('click', () => {
    state.selectedPages = getAllPagesList(state.totalPages);
    updateSelectionState();
  });

  elements.chipClear.addEventListener('click', () => {
    state.selectedPages = [];
    updateSelectionState();
  });

  elements.chipOddPages.addEventListener('click', () => {
    state.selectedPages = getOddPagesList(state.totalPages);
    updateSelectionState();
  });

  elements.chipEvenPages.addEventListener('click', () => {
    state.selectedPages = getEvenPagesList(state.totalPages);
    updateSelectionState();
  });

  elements.chipInvert.addEventListener('click', () => {
    state.selectedPages = invertPagesList(state.selectedPages, state.totalPages);
    updateSelectionState();
  });

  // Filename suffix input
  elements.suffixInput.addEventListener('input', (e) => {
    state.suffix = (e.target as HTMLInputElement).value;
    updateFilenamePreview();
  });

  // Tab switching
  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab as any;
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });

  // Zoom Controls for Document Preview
  elements.btnZoomIn.addEventListener('click', () => {
    if (state.currentZoom < 2.5) {
      state.currentZoom = Math.min(2.5, state.currentZoom + 0.25);
      elements.zoomIndicator.textContent = `${Math.round(state.currentZoom * 100)}%`;
      previewService.renderContinuousDocument(
        state.selectedPages,
        elements.continuousPreviewContainer,
        state.currentZoom
      );
    }
  });

  elements.btnZoomOut.addEventListener('click', () => {
    if (state.currentZoom > 0.5) {
      state.currentZoom = Math.max(0.5, state.currentZoom - 0.25);
      elements.zoomIndicator.textContent = `${Math.round(state.currentZoom * 100)}%`;
      previewService.renderContinuousDocument(
        state.selectedPages,
        elements.continuousPreviewContainer,
        state.currentZoom
      );
    }
  });

  elements.btnZoomReset.addEventListener('click', () => {
    state.currentZoom = 1.0;
    elements.zoomIndicator.textContent = '100%';
    previewService.renderContinuousDocument(
      state.selectedPages,
      elements.continuousPreviewContainer,
      state.currentZoom
    );
  });

  // Export split button vertical 3-dots dropdown
  elements.btnExportMenuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.exportDropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!elements.exportDropdownMenu.contains(e.target as Node)) {
      elements.exportDropdownMenu.classList.remove('show');
    }
  });

  elements.btnExportMain.addEventListener('click', () => {
    performExport('default');
  });

  elements.menuItemDirectDownload.addEventListener('click', () => {
    performExport('direct');
  });

  elements.menuItemSaveAs.addEventListener('click', () => {
    performExport('saveAs');
  });

  elements.menuItemSaveOriginalFolder.addEventListener('click', () => {
    performExport('folder');
  });
}

// Bootstrap
initIcons();
setupEventListeners();
