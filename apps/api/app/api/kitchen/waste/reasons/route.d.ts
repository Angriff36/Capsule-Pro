import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/waste/reasons
 * Get all active waste reasons for dropdown
 */
export declare function GET(): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: {
        id: number;
        description: string | null;
        code: string;
        name: string;
        sortOrder: number;
        colorHex: string | null;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
