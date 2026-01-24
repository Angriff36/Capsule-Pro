import { type NextRequest, NextResponse } from "next/server";
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      id: string;
      channel: string;
      tenantId: string;
      destination: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
