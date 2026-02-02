/**
 * Document Router
 * Routes uploaded files to appropriate parsers based on file type and detected format
 */
import type { ParsedEvent, ParsedEventResult, StaffShift } from "../types/index.js";
export type ProcessedDocument = {
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
};
export type ProcessDocumentOptions = {
    fileName: string;
    sourceName?: string;
};
/**
 * Process a document and route to appropriate parser
 */
export declare function processDocument(fileContent: ArrayBuffer | Uint8Array | string, options: ProcessDocumentOptions): Promise<ProcessedDocument>;
/**
 * Process multiple documents and merge results
 */
export declare function processMultipleDocuments(files: Array<{
    content: ArrayBuffer | Uint8Array | string;
    fileName: string;
}>): Promise<{
    documents: ProcessedDocument[];
    mergedEvent?: ParsedEvent;
    mergedStaff?: StaffShift[];
    errors: string[];
}>;
//# sourceMappingURL=document-router.d.ts.map