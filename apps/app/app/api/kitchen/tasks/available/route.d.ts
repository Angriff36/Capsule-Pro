import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/tasks/available
 *
 * Returns tasks that are available for the current user to claim.
 * Filters out tasks that are already claimed by the current user.
 * Supports filtering by station, priority, and status.
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      tasks: {
        claims: {
          user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
          } | null;
          id: string;
          taskId: string;
          employeeId: string;
          claimedAt: Date;
          releasedAt: Date | null;
          tenantId: string;
          createdAt: Date;
          updatedAt: Date;
          releaseReason: string | null;
        }[];
        isClaimedByOthers: boolean;
        isAvailable: boolean;
        summary: string;
        id: string;
        title: string;
        priority: number;
        status: string;
        tenantId: string;
        complexity: number;
        tags: string[];
        dueDate: Date | null;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
      }[];
      userId: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
