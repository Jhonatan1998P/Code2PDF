# Code2PDF

Code2PDF is a client-side React app that merges multiple code/text files into one structured PDF focused on fast generation and readability.

## Features

- Drag and drop multiple files.
- Reorder and remove files before export.
- Export mode selector: `Rapido` (with formatting) or `Fiel al origen`.
- Fast generation for large files with line numbering and pagination.
- Cover page and file index in the generated PDF.
- Local processing in the browser (no file upload to external servers).

## Supported file extensions

`.txt`, `.md`, `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, `.php`, `.json`

## Run locally

Prerequisite: Node.js 20+

1. Install dependencies:

   `npm install`

2. Start the dev server:

   `npm run dev`

3. Build for production:

   `npm run build`
