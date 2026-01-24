import { type NextRequest, NextResponse } from "next/server";
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
      taskId?: string;
      error?: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
