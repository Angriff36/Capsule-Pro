import { type NextRequest, NextResponse } from "next/server";
export declare function GET(req: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      employees: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
        is_active: boolean;
        phone: string | null;
        avatar_url: string | null;
        employment_type: string;
        hourly_rate: number | null;
        hire_date: Date;
        created_at: Date;
        updated_at: Date;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
