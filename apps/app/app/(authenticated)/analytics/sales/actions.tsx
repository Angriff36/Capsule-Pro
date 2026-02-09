"use server";

import type { ReportSummary } from "./pdf-components";

/**
 * Server action for generating sales report PDFs.
 * Keeps @react-pdf/renderer out of the client bundle.
 */
export async function generateSalesReportPdf(summary: ReportSummary): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    // Lazy load PDF generation libraries and component only on the server
    const [{ renderToBuffer }, { SalesReportDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./pdf-components"),
    ]);

    // Generate PDF as base64 for client-side download
    const pdfBuffer = await renderToBuffer(
      <SalesReportDocument summary={summary} />
    );
    const base64 = pdfBuffer.toString("base64");

    return {
      success: true,
      data: base64,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
