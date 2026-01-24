import { NextResponse } from "next/server";
type SyncResult = {
  successful: Array<{
    taskId: string;
    action: string;
  }>;
  failed: Array<{
    taskId: string;
    action: string;
    error: string;
  }>;
};
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      results: SyncResult;
      summary: {
        total: any;
        successful: number;
        failed: number;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
