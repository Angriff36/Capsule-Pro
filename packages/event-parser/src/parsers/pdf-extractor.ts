/**
 * PDF Text Extractor
 * Extracts text from PDF files using pdfjs-dist (matching Battle-Boards implementation)
 */

import type { TextItem } from "pdfjs-dist/legacy/build/pdf.mjs";

// Import pdfjs-dist with legacy build for Node.js compatibility
// @ts-expect-error - pdfjs-dist types are complex in ESM/Node environments
import {
  GlobalWorkerOptions,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";

// Configure the worker - use CDN for both browser and Node.js environments
// Node.js can fetch from CDN, and this avoids bundling issues
const PDFJS_WORKER_URL =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/legacy/build/pdf.worker.min.mjs";

// Configure the worker
GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

const SHOULD_DISABLE_WORKER = typeof window === "undefined";

const HEADER_PATTERN =
  /^category item special, production notes, container quantity\/?unit$/;
const LABEL_SPLIT_PATTERN = /\s+(?=[A-Za-z][A-Za-z0-9&/\-(),\s]{0,24}:\s)/;
const LABEL_PATTERN = /^([A-Za-z][A-Za-z0-9&/\-(),\s]{0,24}):\s*(.*)$/;
const P_LABEL_PATTERN = /^p$/i;
const TPP_MARKERS = [
  { pattern: /invoice\s*#/i, weight: 20, name: "Invoice #" },
  {
    pattern: /timeline\s*\/\s*key\s*moments/i,
    weight: 20,
    name: "Timeline / Key Moments",
  },
  { pattern: /quantity\s*\/\s*unit/i, weight: 20, name: "Quantity / Unit" },
  {
    pattern: /category.*item.*special.*production/i,
    weight: 15,
    name: "Menu Headers",
  },
  { pattern: /^client:/im, weight: 15, name: "Client:" },
  { pattern: /mangia\s*catering/i, weight: 10, name: "Mangia Catering" },
  {
    pattern: /finish\s*at\s*(event|kitchen)/i,
    weight: 10,
    name: "Service Location",
  },
];

/**
 * PDF metadata info structure
 */
type PdfMetadataInfo = {
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
};

export type PdfExtractionResult = {
  lines: string[];
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
  errors: string[];
};

function extractMetadata(pdf: { getMetadata: () => Promise<unknown> }) {
  return pdf
    .getMetadata()
    .then((metadataResult) => {
      const info = (metadataResult as { info?: PdfMetadataInfo }).info;
      return {
        title: info?.Title,
        author: info?.Author,
        subject: info?.Subject,
        creator: info?.Creator,
      };
    })
    .catch(() => undefined);
}

/**
 * Extract text from a PDF buffer
 */
export async function extractPdfText(
  pdfBuffer: ArrayBuffer | Uint8Array
): Promise<PdfExtractionResult> {
  const errors: string[] = [];
  const allLines: string[] = [];

  try {
    const loadingTask = getDocument({
      data: pdfBuffer,
      disableFontFace: true,
      disableRange: true,
      disableStream: true,
      disableWorker: SHOULD_DISABLE_WORKER,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    // Extract metadata
    const metadata = await extractMetadata(pdf);

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent({
          includeMarkedContent: false,
        });
        // Filter to only items with str and transform (TextItem, not TextMarkedContent)
        const items = textContent.items;
        const textItems: TextItem[] = [];
        for (const item of items) {
          if ("str" in item && "transform" in item) {
            textItems.push(item as unknown as TextItem);
          }
        }
        const pageLines = collapseTextItems(textItems);
        allLines.push(...pageLines);
      } catch (e) {
        errors.push(
          `Error extracting page ${pageNum}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }

    // Clean and filter lines
    const cleanedLines = allLines
      .map((line) =>
        line
          .replace(/\u2010/g, "-")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter((line) => line.length > 0);

    return {
      lines: cleanedLines,
      pageCount,
      metadata,
      errors,
    };
  } catch (e) {
    errors.push(
      `Failed to load PDF: ${e instanceof Error ? e.message : "Unknown error"}`
    );
    return {
      lines: [],
      pageCount: 0,
      errors,
    };
  }
}

/**
 * Collapse text items by Y position to preserve line structure
 */
function collapseTextItems(items: TextItem[]): string[] {
  const rows: string[] = [];
  let currentLine = "";
  let lastY: number | null = null;

  for (const item of items) {
    if (!item.str) {
      continue;
    }

    const text = item.str.replace(/\s+/g, " ").trim();
    if (!text) {
      continue;
    }

    const yPosition = item.transform[5];
    const y = Math.round(yPosition);

    if (lastY !== null && Math.abs(y - lastY) > 3) {
      pushSegments(rows, currentLine);
      currentLine = text;
    } else {
      currentLine += (currentLine ? " " : "") + text;
    }

    lastY = y;
  }

  pushSegments(rows, currentLine);
  return rows;
}

/**
 * Push line segments with label detection
 */
function pushSegments(rows: string[], line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  // Split on common labels
  const initialSegments = trimmed
    .split(LABEL_SPLIT_PATTERN)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of initialSegments) {
    emitSegment(segment, rows);
  }
}

/**
 * Emit a segment with special header handling
 */
function emitSegment(segment: string, rows: string[]) {
  const trimmed = segment.trim();
  if (!trimmed) {
    return;
  }

  const headerCandidate = trimmed.replace(/\s+/g, " ").toLowerCase();
  if (HEADER_PATTERN.test(headerCandidate)) {
    rows.push("Category");
    rows.push("Item");
    rows.push("Special, Production Notes, Container");
    rows.push("Quantity/Unit");
    return;
  }

  const labelMatch = trimmed.match(LABEL_PATTERN);
  if (labelMatch) {
    const labelName = labelMatch[1].trim();
    const remainder = labelMatch[2].trim();

    if (P_LABEL_PATTERN.test(labelName)) {
      const combined = remainder ? `P: ${remainder}` : "P:";
      rows.push(combined.trim());
      return;
    }

    const normalizedLabel = `${labelName}:`.trim();
    rows.push(normalizedLabel);
    if (remainder) {
      emitSegment(remainder, rows);
    }
    return;
  }

  rows.push(trimmed);
}

/**
 * Detect PDF format (TPP, generic, etc.)
 */
export type FormatDetectionResult = {
  format: "tpp" | "generic";
  confidence: number;
  markers: string[];
};

export function detectPdfFormat(lines: string[]): FormatDetectionResult {
  const markers: string[] = [];
  let score = 0;

  const fullText = lines.join("\n");

  for (const marker of TPP_MARKERS) {
    if (marker.pattern.test(fullText)) {
      score += marker.weight;
      markers.push(marker.name);
    }
  }

  const confidence = Math.min(score, 100);
  const format = confidence >= 50 ? "tpp" : "generic";

  return { format, confidence, markers };
}
