/**
 * Document Router
 * Routes uploaded files to appropriate parsers based on file type and detected format
 */

import type { ParsedEvent, ParsedEventResult, StaffShift } from "../types";
import { detectPdfFormat, extractPdfText } from "./pdf-extractor";
import { getEventNamesFromShifts, parseStaffCsv } from "./staff-csv-parser";
import { parseTppEvent } from "./tpp-event-parser";

export interface ProcessedDocument {
  id: string;
  fileName: string;
  fileType: "pdf" | "csv";
  detectedFormat: string;
  confidence: number;
  parsedEvent?: ParsedEventResult;
  staffShifts?: Map<string, StaffShift[]>;
  availableEventNames?: string[];
  errors: string[];
  warnings: string[];
}

export interface ProcessDocumentOptions {
  fileName: string;
  sourceName?: string;
}

/**
 * Process a document and route to appropriate parser
 */
export async function processDocument(
  fileContent: ArrayBuffer | Uint8Array | string,
  options: ProcessDocumentOptions
): Promise<ProcessedDocument> {
  const id = generateDocumentId();
  const fileName = options.fileName;
  const errors: string[] = [];
  const warnings: string[] = [];

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
    // Extract text from PDF
    const pdfBuffer =
      fileContent instanceof ArrayBuffer
        ? fileContent
        : fileContent instanceof Uint8Array
          ? fileContent.buffer
          : new TextEncoder().encode(fileContent).buffer;

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
export async function processMultipleDocuments(
  files: Array<{ content: ArrayBuffer | Uint8Array | string; fileName: string }>
): Promise<{
  documents: ProcessedDocument[];
  mergedEvent?: ParsedEvent;
  mergedStaff?: StaffShift[];
  errors: string[];
}> {
  const documents: ProcessedDocument[] = [];
  const errors: string[] = [];
  let mergedEvent: ParsedEvent | undefined;
  const mergedStaff: StaffShift[] = [];

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

function detectFileType(fileName: string): "pdf" | "csv" | "unknown" {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "pdf") return "pdf";
  if (ext === "csv") return "csv";
  return "unknown";
}

function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
