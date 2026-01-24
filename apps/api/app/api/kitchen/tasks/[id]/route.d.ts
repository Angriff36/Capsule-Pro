import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
export declare function PATCH(
  request: Request,
  context: RouteContext
): Promise<
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
