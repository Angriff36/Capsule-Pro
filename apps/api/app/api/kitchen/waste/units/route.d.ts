import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/waste/units
 * Get all available measurement units for waste tracking
 */
export declare function GET(): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: {
        id: number;
        code: string;
        name: string;
        name_plural: string;
        unit_system: string;
        unit_type: string;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
