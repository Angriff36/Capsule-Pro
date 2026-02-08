/**
 * PDF Text Extractor
 * Extracts text from PDF files using pdfjs-dist
 * Uses dynamic import to avoid Next.js bundling issues
 */
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
 * Uses dynamic import to avoid Next.js bundling issues with pdfjs-dist workers
 */
export declare function extractPdfText(
  pdfBuffer: ArrayBuffer | Uint8Array
): Promise<PdfExtractionResult>;
/**
 * Detect PDF format (TPP, generic, etc.)
 */
export interface FormatDetectionResult {
  format: "tpp" | "generic";
  confidence: number;
  markers: string[];
}
export declare function detectPdfFormat(lines: string[]): FormatDetectionResult;
//# sourceMappingURL=pdf-extractor.d.ts.map
