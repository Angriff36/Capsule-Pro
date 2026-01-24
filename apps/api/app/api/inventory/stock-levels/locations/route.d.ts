/**
 * Storage Locations API Endpoint
 *
 * GET    /api/inventory/stock-levels/locations      - List storage locations
 */
import { NextResponse } from "next/server";
import type { LocationListResponse } from "../types";
/**
 * GET /api/inventory/stock-levels/locations - List storage locations
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<LocationListResponse>
>;
//# sourceMappingURL=route.d.ts.map
