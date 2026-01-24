import { type NextRequest, NextResponse } from "next/server";
export declare function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      eventId: string;
    }>;
  }
): Promise<
  | NextResponse<
      {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        eventId: string;
        dishId: string | null;
        allergens: string[];
        resolvedAt: Date | null;
        overrideReason: string | null;
        isAcknowledged: boolean;
        acknowledgedBy: string | null;
        acknowledgedAt: Date | null;
        resolved: boolean;
        warningType: string;
        affectedGuests: string[];
        severity: string;
      }[]
    >
  | NextResponse<{
      error: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
