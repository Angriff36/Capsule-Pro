import { type NextRequest, NextResponse } from "next/server";
/**
 * POST /api/kitchen/prep-lists/save-db
 * Save a generated prep list to the database
 */
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      message: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
