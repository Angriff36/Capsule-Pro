import { type NextRequest, NextResponse } from "next/server";
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      success: boolean;
    }>
>;
//# sourceMappingURL=route.d.ts.map
