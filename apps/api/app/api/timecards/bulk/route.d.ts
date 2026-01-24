import { NextResponse } from "next/server";
export declare function POST(request: Request): Promise<
  NextResponse<{
    message: string;
  }>
>;
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      editRequests: {
        id: string;
        time_entry_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        requested_clock_in: Date | null;
        requested_clock_out: Date | null;
        requested_break_minutes: number | null;
        reason: string;
        status: string;
        created_at: Date;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
