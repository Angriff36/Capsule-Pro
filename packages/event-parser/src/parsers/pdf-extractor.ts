/**
 * PDF Text Extractor
 * Extracts text from PDF files using pdfjs-dist
 * Uses dynamic import to avoid Next.js bundling issues
 */

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
 * Collapse text items by Y position to preserve line structure
 */
function collapseTextItems(items: any[]): string[] {
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
 * Extract text from a PDF buffer
 * Uses dynamic import to avoid Next.js bundling issues with pdfjs-dist workers
 */
export async function extractPdfText(
  pdfBuffer: ArrayBuffer | Uint8Array
): Promise<PdfExtractionResult> {
  const errors: string[] = [];
  const allLines: string[] = [];

  // Debug logging to trace data type
  console.log('[extractPdfText] Input type:', pdfBuffer.constructor.name);
  console.log('[extractPdfText] Input length:', 'length' in pdfBuffer ? pdfBuffer.length : pdfBuffer.byteLength);

  // Ensure we have a Uint8Array (pdfjs-dist requires this, not Buffer)
  // Note: The document-router should have already created a copy to avoid detached ArrayBuffer issues
  let data: Uint8Array;
  const inputType = pdfBuffer.constructor.name;

  if (inputType === 'Buffer') {
    console.log('[extractPdfText] Converting Buffer to Uint8Array');
    const buffer = pdfBuffer as unknown as Buffer & { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
    // Create a proper copy, not a view, to avoid detached ArrayBuffer issues
    const tempView = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    data = new Uint8Array(tempView.length);
    data.set(tempView);
  } else if (pdfBuffer instanceof Uint8Array) {
    data = pdfBuffer;
  } else {
    throw new Error(`Unsupported input type: ${inputType}`);
  }

  console.log('[extractPdfText] Final data type:', data.constructor.name, 'length:', data.length);

  try {
    // Use pdf2json - pure JavaScript PDF parser, no worker issues
    // Handle both named and default exports for different module formats
    const pdf2jsonModule = await import("pdf2json");
    const PDFParserClass = pdf2jsonModule.PDFParser || pdf2jsonModule.default;

    if (!PDFParserClass) {
      throw new Error("Failed to load PDFParser: export not found in pdf2json module");
    }

    // pdf2json handles Buffer directly
    const buffer = Buffer.from(data);

    // Parse PDF using event-based API
    return new Promise((resolve) => {
      const pdfParser = new PDFParserClass();

      // Collect all data
      let pdfData: any = null;

      pdfParser.on("pdfParser_dataError", (errData: { parserError: Error } | Error) => {
        const errMsg = errData instanceof Error ? errData.message : JSON.stringify(errData);
        const errStack = errData instanceof Error ? errData.stack : undefined;
        console.error('[extractPdfText] PDFParser error:', errData);
        console.error('[extractPdfText] Error message:', errMsg);
        console.error('[extractPdfText] Error stack:', errStack);
        errors.push(`Failed to load PDF: ${errMsg}`);
        if (errStack) {
          errors.push(`Stack: ${errStack}`);
        }
        resolve({
          lines: [],
          pageCount: 0,
          errors,
        });
      });

      pdfParser.on("pdfParser_dataReady", (data: any) => {
        pdfData = data;

        try {
          // Extract text from all pages
          const allPageLines: string[] = [];

          if (pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const textItem of page.Texts) {
                  if (textItem.R) {
                    // Array of text runs
                    for (const run of textItem.R) {
                      if (run.T) {
                        allPageLines.push(run.T);
                      }
                    }
                  }
                }
              }
            }
          }

          // Clean and filter lines
          const cleanedLines = allPageLines
            .map((line) =>
              line
                .replace(/\u2010/g, "-")
                .replace(/\s+/g, " ")
                .trim()
            )
            .filter((line) => line.length > 0);

          const pageCount = pdfData.Pages ? pdfData.Pages.length : 0;

          resolve({
            lines: cleanedLines,
            pageCount,
            metadata: {
              title: pdfData.Meta?.Title,
              author: pdfData.Meta?.Author,
              subject: pdfData.Meta?.Subject,
              creator: pdfData.Meta?.Creator,
            },
            errors: [],
          });

          // Clean up
          pdfParser.destroy();
        } catch (e) {
          errors.push(`Failed to process PDF data: ${e instanceof Error ? e.message : "Unknown error"}`);
          resolve({
            lines: [],
            pageCount: 0,
            errors,
          });
        }
      });

      // Start parsing - maxPagePages=0 means all pages
      pdfParser.parseBuffer(buffer);
    });
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
 * Emit a segment with label detection
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
