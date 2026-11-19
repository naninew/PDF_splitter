# PDF Splitter & Merger

A serverless, client-side web application designed to extract, reorder, duplicate, and merge PDF pages directly in the user's browser. Built for deployment on GitHub Pages with zero server dependencies, complete privacy, and a clean Google Chrome light theme aesthetic.

---

## Key Features

- **100% Client-Side & Private**: All parsing, rendering, and PDF assembly occurs in the user's browser runtime via `pdf-lib` and `pdfjs-dist`. Documents never leave your local machine.
- **100% Visual UI Selection (Designed for Non-Tech Users)**:
  - **Zero Manual Typing**: Completely eliminates typing syntax errors.
  - **Visual Range Adder**: Select `From page [1..N]` and `To page [1..N]` and click `[+ Add Range]`.
  - **Thumbnail Stepper Controls**: Every page card in the organizer grid features `[-]`, `[Count]`, and `[+]` buttons to easily increase, decrease, or remove duplicated pages with 1 click.
  - **Selected Pages Queue (Tray)**: Visual chips showing the exact extraction order (`Pg 2`, `Pg 3`, `Pg 15`, `Pg 15`). Allows 1-click reordering with `◀` / `▶` and deletion with `×`.
  - **Quick Action Presets**: `Select All`, `Clear All`, `Odd Pages`, `Even Pages`, and `Invert`.
- **Continuous Mouse-Wheel PDF Preview**:
  - Continuous vertical scroll viewer (`Document Preview` tab) supporting standard **mouse wheel scrolling** just like native Adobe Acrobat or Chrome PDF viewer.
  - Lazy on-demand page rendering via `IntersectionObserver` for high performance.
  - Zoom controls: Zoom In, Zoom Out, and Reset Zoom (50% to 250%).
- **Customizable Output Filename**:
  - Automatically appends a configurable suffix before `.pdf` (defaults to `_extracted`).
  - Example: `Annual_Report.pdf` $\to$ `Annual_Report_extracted.pdf`.
  - Live preview and automatic filesystem character sanitization.
- **Flexible Upload & Export**:
  - **Drag-and-Drop** and standard file picker.
  - **Direct Save to Original Folder**: Using Chromium's File System Access API (`showDirectoryPicker`), users can open a folder and save the newly generated PDF directly into the exact parent folder alongside the original without modifying the original document.
  - **Native Save As Dialog** (`showSaveFilePicker`) and universal Blob download fallback for Firefox/Safari/mobile.
- **Clean Chrome Design Language**:
  - Crisp light theme (`#F8F9FA`, `#FFFFFF`, Chrome Blue `#1A73E8`).
  - **Strictly zero emojis**; uses clean, high-precision SVG icons.
  - Full English user interface.

---

## Technical Stack

- **Framework**: Vite + TypeScript
- **PDF Manipulation**: `pdf-lib` (pure JavaScript binary serialization)
- **PDF Rendering**: `pdfjs-dist` (Mozilla PDF.js with dedicated web worker)
- **Unit Testing**: `vitest` (29 comprehensive automated tests)
- **Styling**: Vanilla CSS with Chrome design tokens and responsive CSS Grid/Flexbox

---

## Project Structure

```
PDF_splitter/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow for GitHub Pages
├── src/
│   ├── scripts/
│   │   ├── main.ts             # Application controller and UI event binding
│   │   ├── page-selection.ts   # Visual array selection, reordering, and steppers
│   │   ├── range-parser.ts     # Range parsing & validation utilities
│   │   ├── pdf-service.ts      # pdf-lib integration (extract, reorder, assemble)
│   │   ├── preview-service.ts  # PDF.js continuous scroll rendering & thumbnails
│   │   ├── file-system.ts      # File System Access API, folder saver, fallback downloads
│   │   └── icons.ts            # Chrome-styled Material SVG icons (NO emojis)
│   ├── styles/
│   │   ├── main.css            # Chrome light theme variables, base layout
│   │   ├── components.css      # Dropzone, buttons, range adder, tray, dropdowns
│   │   └── preview.css         # Continuous scroll viewer, thumbnail steppers
│   ├── tests/
│   │   ├── page-selection.test.ts# Vitest tests for visual selection & steppers
│   │   ├── pdf-service.test.ts   # Vitest tests for extraction, duplicates & buffer safety
│   │   ├── range-parser.test.ts  # Vitest tests for syntax validation
│   │   └── filename.test.ts      # Vitest tests for suffix and sanitization
│   └── vite-env.d.ts
├── index.html                  # Main application markup
├── package.json
├── tsconfig.json
├── vite.config.ts              # Relative path configuration (base: './')
└── README.md
```

---

## Local Development & Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Build for Production
```bash
npm run build
```
The compiled, production-ready static assets are output to the `dist/` directory.

---

## Deployment to GitHub Pages

This repository includes a pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`).

To deploy:
1. Push your repository commits to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete PDF Splitter web application"
   git push origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** $\to$ **Pages**.
   - Under **Build and deployment** $\to$ **Source**, choose **GitHub Actions**.
3. The workflow will automatically trigger, build the project, run tests, and publish the static website to:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```
