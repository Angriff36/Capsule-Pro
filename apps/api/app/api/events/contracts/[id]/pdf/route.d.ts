import { type NextRequest, NextResponse } from "next/server";
export declare const runtime = "nodejs";
type RouteParams = Promise<{
  id: string;
}>;
/**
 * GET /api/events/contracts/[id]/pdf
 *
 * Generate a PDF export of a contract.
 *
 * Query parameters:
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
