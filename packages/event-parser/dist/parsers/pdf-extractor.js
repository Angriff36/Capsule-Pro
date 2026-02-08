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
function _extractMetadata(pdf) {
  return pdf
    .getMetadata()
    .then((metadataResult) => {
      const info = metadataResult.info;
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
function _collapseTextItems(items) {
  const rows = [];
  let currentLine = "";
  let lastY = null;
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
function pushSegments(rows, line) {
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
export async function extractPdfText(pdfBuffer) {
  const errors = [];
  const _allLines = [];
  // Debug logging to trace data type
  console.log("[extractPdfText] Input type:", pdfBuffer.constructor.name);
  console.log(
    "[extractPdfText] Input length:",
    "length" in pdfBuffer ? pdfBuffer.length : pdfBuffer.byteLength
  );
  // Ensure we have a Uint8Array (pdfjs-dist requires this, not Buffer)
  // Note: The document-router should have already created a copy to avoid detached ArrayBuffer issues
  let data;
  const inputType = pdfBuffer.constructor.name;
  if (inputType === "Buffer") {
    console.log("[extractPdfText] Converting Buffer to Uint8Array");
    const buffer = pdfBuffer;
    // Create a proper copy, not a view, to avoid detached ArrayBuffer issues
    const tempView = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    data = new Uint8Array(tempView.length);
    data.set(tempView);
  } else if (pdfBuffer instanceof Uint8Array) {
    data = pdfBuffer;
  } else {
    throw new Error(`Unsupported input type: ${inputType}`);
  }
  console.log(
    "[extractPdfText] Final data type:",
    data.constructor.name,
    "length:",
    data.length
  );
  try {
    const isRecord = (value) => typeof value === "object" && value !== null;
    const isParserCtor = (value) => typeof value === "function";
    const pdf2jsonModule = await import("pdf2json");
    const defaultExport = pdf2jsonModule.default;
    const PDFParserClass =
      (isParserCtor(pdf2jsonModule.PDFParser)
        ? pdf2jsonModule.PDFParser
        : undefined) ??
      (isRecord(defaultExport) && isParserCtor(defaultExport.PDFParser)
        ? defaultExport.PDFParser
        : undefined) ??
      (isParserCtor(defaultExport) ? defaultExport : undefined);
    if (!PDFParserClass) {
      throw new Error(
        "Failed to load PDFParser: export not found in pdf2json module"
      );
    }
    // pdf2json handles Buffer directly
    const buffer = Buffer.from(data);
    return new Promise((resolve) => {
      const pdfParser = new PDFParserClass();
      let pdfData = null;
      pdfParser.on("pdfParser_dataError", (errData) => {
        let errMsg;
        let errStack;
        if (errData instanceof Error) {
          errMsg = errData.message;
          errStack = errData.stack;
        } else if (
          errData &&
          typeof errData === "object" &&
          "parserError" in errData
        ) {
          const parserError = errData.parserError;
          errMsg = parserError?.message ?? JSON.stringify(errData);
          errStack = parserError?.stack;
        } else {
          errMsg = JSON.stringify(errData);
          errStack = undefined;
        }
        console.error("[extractPdfText] PDFParser error:", errData);
        errors.push(`Failed to load PDF: ${errMsg}`);
        if (errStack) errors.push(`Stack: ${errStack}`);
        resolve({ lines: [], pageCount: 0, errors });
      });
      pdfParser.on("pdfParser_dataReady", (data) => {
        pdfData = data;
        try {
          const allPageLines = [];
          if (pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const textItem of page.Texts) {
                  if (textItem.R) {
                    for (const run of textItem.R) {
                      if (run.T) allPageLines.push(run.T);
                    }
                  }
                }
              }
            }
          }
          const cleanedLines = allPageLines
            .map((line) =>
              line.replaceAll("\u2010", "-").replaceAll(/\s+/g, " ").trim()
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
          if (typeof pdfParser.destroy === "function") {
            pdfParser.destroy();
          }
        } catch (e) {
          errors.push(
            `Failed to process PDF data: ${e instanceof Error ? e.message : "Unknown error"}`
          );
          resolve({ lines: [], pageCount: 0, errors });
        }
      });
      // pdf2json docs show parseBuffer(buffer) usage
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
function emitSegment(segment, rows) {
  const trimmed = segment.trim();
  if (!trimmed) {
    return;
  }
  const headerCandidate = trimmed.replaceAll(/\s+/g, " ").toLowerCase();
  if (HEADER_PATTERN.test(headerCandidate)) {
    rows.push(
      "Category",
      "Item",
      "Special, Production Notes, Container",
      "Quantity/Unit"
    );
    return;
  }
  const labelMatch = LABEL_PATTERN.exec(trimmed);
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
export function detectPdfFormat(lines) {
  const markers = [];
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
