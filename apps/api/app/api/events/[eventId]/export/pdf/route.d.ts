/**
 * @module EventExportPDF
 * @intent Export event details to PDF format
 * @responsibility Generate PDF export for a single event
 * @domain Events
 * @tags events, export, pdf
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
export declare const runtime = "nodejs";
type RouteParams = Promise<{
  eventId: string;
}>;
/**
 * GET /api/events/[eventId]/export/pdf
 *
 * Generate a PDF export of event details.
 *
 * Query parameters:
 * - include: string - Comma-separated list of sections to include (summary,menu,staff,guests,tasks)
 *   Default: "summary,menu,staff"
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
export declare function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: RouteParams;
  }
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
