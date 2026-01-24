import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/tasks/my-tasks
 *
 * Returns tasks that are currently claimed by the current user.
 * This is the "My Tasks" view for mobile users.
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      tasks: {
        claimedAt: Date | undefined;
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
