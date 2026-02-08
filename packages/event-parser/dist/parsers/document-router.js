/**
 * Document Router
 * Routes uploaded files to appropriate parsers based on file type and detected format
 */
import { detectPdfFormat, extractPdfText } from "./pdf-extractor.js";
import { getEventNamesFromShifts, parseStaffCsv } from "./staff-csv-parser.js";
import { parseTppEvent } from "./tpp-event-parser.js";
/**
 * Process a document and route to appropriate parser
 */
export async function processDocument(fileContent, options) {
  const id = generateDocumentId();
  const fileName = options.fileName;
  const errors = [];
  const warnings = [];
  // Determine file type
  const fileType = detectFileType(fileName);
  if (fileType === "csv") {
    // Process CSV as staff roster
    const csvContent =
      typeof fileContent === "string"
        ? fileContent
        : new TextDecoder().decode(
            fileContent instanceof ArrayBuffer
              ? new Uint8Array(fileContent)
              : fileContent
          );
    const parseResult = parseStaffCsv(csvContent);
    errors.push(...parseResult.errors);
    const eventNames = getEventNamesFromShifts(parseResult);
    return {
      id,
      fileName,
      fileType: "csv",
      detectedFormat: "staff_roster",
      confidence: parseResult.errors.length === 0 ? 90 : 60,
      staffShifts: parseResult.shifts,
      availableEventNames: eventNames,
      errors,
      warnings,
    };
  }
  if (fileType === "pdf") {
    // Debug logging
    console.log(
      "[processDocument] PDF file type:",
      fileContent.constructor.name
    );
    console.log(
      "[processDocument] Original fileContent type:",
      Object.getPrototypeOf(fileContent).constructor.name
    );
    // Extract text from PDF
    // Handle various input types that Next.js might pass us
    let pdfBuffer;
    if (fileContent instanceof Uint8Array) {
      // API route already created a copy, so we can use it directly
      pdfBuffer = fileContent;
    } else if (fileContent instanceof ArrayBuffer) {
      pdfBuffer = new Uint8Array(fileContent);
    } else if (typeof fileContent === "string") {
      pdfBuffer = new TextEncoder().encode(fileContent);
    } else {
      // Fallback: try to handle any other type (Buffer, Next.js File, etc.)
      const unknownContent = fileContent;
      // Check for Buffer-like objects with buffer, byteOffset, byteLength properties
      if (
        "buffer" in unknownContent &&
        "byteOffset" in unknownContent &&
        "byteLength" in unknownContent
      ) {
        const bufferLike = unknownContent;
        pdfBuffer = new Uint8Array(
          bufferLike.buffer,
          bufferLike.byteOffset,
          bufferLike.byteLength
        );
      } else {
        throw new Error(
          `Unsupported PDF input type: ${unknownContent.constructor.name}`
        );
      }
    }
    console.log(
      "[processDocument] Converted pdfBuffer type:",
      pdfBuffer.constructor.name
    );
    console.log("[processDocument] pdfBuffer length:", pdfBuffer.length);
    // Skip slice() debug logging to avoid detached ArrayBuffer issues
    const extractResult = await extractPdfText(pdfBuffer);
    errors.push(...extractResult.errors);
    if (extractResult.lines.length === 0) {
      errors.push("No text could be extracted from PDF");
      return {
        id,
        fileName,
        fileType: "pdf",
        detectedFormat: "unknown",
        confidence: 0,
        errors,
        warnings,
      };
    }
    // Detect format
    const formatResult = detectPdfFormat(extractResult.lines);
    if (formatResult.format === "tpp") {
      // Parse as TPP event
      const parseResult = parseTppEvent(extractResult.lines, {
        sourceName: options.sourceName || fileName,
      });
      warnings.push(...parseResult.warnings);
      return {
        id,
        fileName,
        fileType: "pdf",
        detectedFormat: "tpp",
        confidence: formatResult.confidence,
        parsedEvent: parseResult,
        errors,
        warnings,
      };
    }
    // Generic PDF - return raw lines for manual processing
    warnings.push(
      "PDF format not recognized as TPP. Manual data entry may be required."
    );
    return {
      id,
      fileName,
      fileType: "pdf",
      detectedFormat: "generic",
      confidence: formatResult.confidence,
      errors,
      warnings,
    };
  }
  errors.push(`Unsupported file type: ${fileName}`);
  return {
    id,
    fileName,
    fileType: "pdf",
    detectedFormat: "unknown",
    confidence: 0,
    errors,
    warnings,
  };
}
/**
 * Process multiple documents and merge results
 */
export async function processMultipleDocuments(files) {
  const documents = [];
  const errors = [];
  let mergedEvent;
  const mergedStaff = [];
  // Process all documents
  for (const file of files) {
    const result = await processDocument(file.content, {
      fileName: file.fileName,
    });
    documents.push(result);
    errors.push(...result.errors);
  }
  // Find the primary event (from TPP PDF)
  const eventDoc = documents.find(
    (doc) => doc.detectedFormat === "tpp" && doc.parsedEvent
  );
  if (eventDoc?.parsedEvent) {
    mergedEvent = eventDoc.parsedEvent.event;
  }
  // Collect all staff shifts
  for (const doc of documents) {
    if (doc.staffShifts) {
      // If we have an event, try to match by name
      if (mergedEvent) {
        // Try to find shifts matching the event
        const eventNameVariations = [
          mergedEvent.client,
          mergedEvent.number,
          `${mergedEvent.client} ${mergedEvent.date}`,
        ].filter(Boolean);
        for (const [eventName, shifts] of doc.staffShifts) {
          const matches = eventNameVariations.some(
            (variation) =>
              eventName.toLowerCase().includes(variation.toLowerCase()) ||
              variation.toLowerCase().includes(eventName.toLowerCase())
          );
          if (matches || doc.staffShifts.size === 1) {
            mergedStaff.push(...shifts);
          }
        }
      } else {
        // No event context, include all shifts
        for (const shifts of doc.staffShifts.values()) {
          mergedStaff.push(...shifts);
        }
      }
    }
  }
  // Merge staff into event if we have both
  if (mergedEvent && mergedStaff.length > 0) {
    mergedEvent = {
      ...mergedEvent,
      staffing: mergedStaff,
    };
  }
  return {
    documents,
    mergedEvent,
    mergedStaff,
    errors,
  };
}
// --- Helper Functions ---
function detectFileType(fileName) {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    return "pdf";
  }
  if (ext === "csv") {
    return "csv";
  }
  return "unknown";
}
function generateDocumentId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
