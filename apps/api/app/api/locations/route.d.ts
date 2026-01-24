import { type NextRequest, NextResponse } from "next/server";
export declare function GET(req: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      locations: {
        id: string;
        name: string;
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        state_province: string | null;
        postal_code: string | null;
        country_code: string | null;
        timezone: string | null;
        is_primary: boolean;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
