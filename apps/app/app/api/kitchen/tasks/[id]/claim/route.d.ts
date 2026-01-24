import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
export declare function POST(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      claim: {
        id: string;
        taskId: string;
        employeeId: string;
        claimedAt: Date;
        releasedAt: Date | null;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        releaseReason: string | null;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
