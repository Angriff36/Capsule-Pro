import { NextResponse } from "next/server";
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
    }>
>;
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      task: {
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
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
