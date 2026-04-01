import { getReadableLanguage } from "@/src/lib/file-utils";

interface WorkerFile {
  name: string;
  content: string;
  extension: string;
  size: number;
}

interface PreprocessRequest {
  type: "preprocess";
  files: WorkerFile[];
  maxCharsPerLine: number;
  linesPerPage: number;
}

interface ProcessedFile {
  name: string;
  language: string;
  sizeKb: string;
  pages: string[][];
}

function wrapLine(line: string, maxChars: number): string[] {
  if (maxChars <= 0) {
    return [line];
  }

  if (line.length <= maxChars) {
    return [line];
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < line.length) {
    chunks.push(line.slice(cursor, cursor + maxChars));
    cursor += maxChars;
  }
  return chunks;
}

function toPages(lines: string[], linesPerPage: number): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages;
}

self.onmessage = (event: MessageEvent<PreprocessRequest>) => {
  const payload = event.data;
  if (!payload || payload.type !== "preprocess") {
    return;
  }

  const { files, maxCharsPerLine, linesPerPage } = payload;
  const processed: ProcessedFile[] = [];
  const total = files.length;

  files.forEach((file, fileIndex) => {
    const sourceLines = file.content.split("\n");
    const lineNumberWidth = String(sourceLines.length).length;
    const continuationPrefix = `${" ".repeat(lineNumberWidth)} | `;
    const availableChars = Math.max(12, maxCharsPerLine - continuationPrefix.length);

    const outputLines: string[] = [];
    outputLines.push(`[${fileIndex + 1}/${total}] ${file.name}`);
    outputLines.push(
      `Lenguaje: ${getReadableLanguage(file.extension)} | Tamano: ${(file.size / 1024).toFixed(1)} KB | Lineas: ${sourceLines.length}`,
    );
    outputLines.push("");

    sourceLines.forEach((raw, lineIndex) => {
      const normalized = raw.replace(/\t/g, "  ");
      const wrapped = wrapLine(normalized, availableChars);
      const numberPrefix = `${String(lineIndex + 1).padStart(lineNumberWidth, " ")} | `;

      wrapped.forEach((segment, segmentIndex) => {
        outputLines.push(`${segmentIndex === 0 ? numberPrefix : continuationPrefix}${segment}`);
      });
    });

    outputLines.push("");

    processed.push({
      name: file.name,
      language: getReadableLanguage(file.extension),
      sizeKb: (file.size / 1024).toFixed(1),
      pages: toPages(outputLines, linesPerPage),
    });

    self.postMessage({
      type: "progress",
      stage: "preprocess",
      value: Math.round(((fileIndex + 1) / total) * 60),
    });
  });

  self.postMessage({
    type: "done",
    files: processed,
  });
};
