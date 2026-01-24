/**
 * @module EventExportCSV
 * @intent Export event data to CSV format
 * @responsibility Generate CSV export for a single event
 * @domain Events
 * @tags events, export, csv
 * @canonical true
 */
import { NextResponse } from "next/server";
type RouteParams = Promise<{
  eventId: string;
}>;
/**
 * GET /api/events/[eventId]/export/csv
 *
 * Export event data to CSV format.
 *
 * Query parameters:
 * - include: string - Comma-separated list of sections to include (summary,menu,staff,guests)
 *   Default: "summary"
 * - download: boolean - If true, returns as downloadable file; otherwise as text
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: RouteParams;
  }
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
