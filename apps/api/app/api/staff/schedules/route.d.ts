import { type NextRequest, NextResponse } from "next/server";
export declare function GET(req: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      schedules: {
        id: string;
        location_id: string | null;
        schedule_date: Date;
        status: string;
        published_at: Date | null;
        published_by: string | null;
        created_at: Date;
        updated_at: Date;
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
