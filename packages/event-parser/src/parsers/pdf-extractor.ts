/**
 * PDF Text Extractor
 * Extracts text from PDF files using pdfjs-dist
 */

import * as pdfjsLib from "pdfjs-dist";

/**
 * Represents a text item from PDF.js TextContent
 */
interface TextItem {
  str: string;
  transform: number[];
  [key: string]: unknown;
}

/**
 * PDF metadata info structure
 */
interface PdfMetadataInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
}

// Configure the worker
// In Node.js environments, pdfjs-dist uses worker-loader or fake worker
// For Next.js, we'll use the standard worker path
let workerInitialized = false;

function initializeWorker() {
  if (workerInitialized) return;

  // For server-side rendering in Next.js
  if (typeof window === "undefined") {
    // Node.js environment - use fake worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  } else {
    // Browser environment - use CDN worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  workerInitialized = true;
}

export interface PdfExtractionResult {
  lines: string[];
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
  errors: string[];
}

/**
 * Extract text from a PDF buffer
 */
export async function extractPdfText(
  pdfBuffer: ArrayBuffer | Uint8Array
): Promise<PdfExtractionResult> {
  initializeWorker();

  const errors: string[] = [];
  const allLines: string[] = [];

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    // Extract metadata
    let metadata;
    try {
      const metadataResult = await pdf.getMetadata();
      const info = metadataResult?.info as PdfMetadataInfo | undefined;
      metadata = {
        title: info?.Title,
        author: info?.Author,
        subject: info?.Subject,
        creator: info?.Creator,
      };
    } catch {
      // Metadata extraction is optional
    }

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageLines = collapseTextItems(textContent.items);
        allLines.push(...pageLines);
      } catch (e) {
        errors.push(
          `Error extracting page ${pageNum}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }

    return {
      lines: allLines,
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
  if (!items || items.length === 0) {
    return [];
  }

  // Group items by their Y position (with tolerance)
  const yTolerance = 3;
  const lineGroups: Map<number, { x: number; text: string }[]> = new Map();

  for (const item of items) {
    if (!item.str || item.str.trim() === "") continue;

    const y = Math.round(item.transform[5] / yTolerance) * yTolerance;
    const x = item.transform[4];

    if (!lineGroups.has(y)) {
      lineGroups.set(y, []);
    }
    lineGroups.get(y)!.push({ x, text: item.str });
  }

  // Sort groups by Y position (descending - PDF coordinates are bottom-up)
  const sortedYs = Array.from(lineGroups.keys()).sort((a, b) => b - a);

  // Build lines from groups
  const lines: string[] = [];

  for (const y of sortedYs) {
    const group = lineGroups.get(y)!;
    // Sort items within line by X position
    group.sort((a, b) => a.x - b.x);

    // Join text items with appropriate spacing
    let lineText = "";
    let lastX = Number.NEGATIVE_INFINITY;

    for (const item of group) {
      const gap = item.x - lastX;
      // Add space if there's a significant gap
      if (gap > 10 && lineText.length > 0) {
        lineText += " ";
      }
      lineText += item.text;
      lastX = item.x + item.text.length * 5; // Rough estimate of text width
    }

    const cleaned = cleanLine(lineText);
    if (cleaned) {
      lines.push(cleaned);
    }
  }

  return lines;
}

/**
 * Clean up a text line
 */
function cleanLine(text: string): string {
  return text
    .replace(/\uFFFD/g, "") // Remove replacement characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Detect PDF format (TPP, generic, etc.)
 */
export interface FormatDetectionResult {
  format: "tpp" | "generic";
  confidence: number;
  markers: string[];
}

export function detectPdfFormat(lines: string[]): FormatDetectionResult {
  const markers: string[] = [];
  let score = 0;

  const tppMarkers = [
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

  const fullText = lines.join("\n");

  for (const marker of tppMarkers) {
    if (marker.pattern.test(fullText)) {
      score += marker.weight;
      markers.push(marker.name);
    }
  }

  const confidence = Math.min(score, 100);
  const format = confidence >= 50 ? "tpp" : "generic";

  return { format, confidence, markers };
}
