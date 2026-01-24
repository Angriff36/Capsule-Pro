import { type NextRequest, NextResponse } from "next/server";
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<
      import("../../../../(authenticated)/kitchen/prep-lists/actions").PrepListGenerationResult
    >
>;
//# sourceMappingURL=route.d.ts.map
