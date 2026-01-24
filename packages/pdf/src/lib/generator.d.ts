import type React from "react";
import type { PDFConfig, PDFGenerationOptions } from "../types";
/**
 * PDF Document wrapper component
 */
export declare const PDFDocument: React.FC<{
  children: React.ReactNode;
  config?: PDFConfig;
  options?: PDFGenerationOptions;
}>;
/**
 * Generate PDF from a React component
 *
 * @param component - The React component to render as PDF
 * @param filename - Optional filename for the PDF
 * @returns PDF blob as Uint8Array
 */
export declare function generatePDF(
  component: React.ReactElement,
  filename?: string
): Promise<Uint8Array>;
/**
 * Generate and download PDF in browser
 *
 * @param component - The React component to render as PDF
 * @param filename - The filename for the downloaded PDF (without .pdf extension)
 * @returns Promise that resolves when download is complete
 */
export declare function downloadPDF(
  component: React.ReactElement,
  filename?: string
): Promise<void>;
/**
 * Get PDF as base64 string
 *
 * @param component - The React component to render as PDF
 * @returns Base64 encoded PDF string
 */
export declare function getPDFAsBase64(
  component: React.ReactElement
): Promise<string>;
/**
 * Get PDF as data URL
 *
 * @param component - The React component to render as PDF
 * @returns Data URL string (data:application/pdf;base64,...)
 */
export declare function getPDFAsDataUrl(
  component: React.ReactElement
): Promise<string>;
//# sourceMappingURL=generator.d.ts.map
