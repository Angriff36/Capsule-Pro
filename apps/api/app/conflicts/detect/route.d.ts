import { NextResponse } from "next/server";
export declare function POST(request: Request): Promise<
  | NextResponse<import("../types").ConflictDetectionResult>
  | NextResponse<{
      error: string;
      message: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
