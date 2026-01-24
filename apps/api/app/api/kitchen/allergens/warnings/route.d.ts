/**
 * @module AllergenWarningsAPI
 * @intent Fetch all allergen warnings with optional filtering
 * @responsibility List warnings across all events with filtering by acknowledgment status, severity
 * @domain Kitchen
 * @tags allergens, warnings, api
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
export declare function GET(request: NextRequest): Promise<
  | NextResponse<{
      warnings: {
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
      }[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
      };
    }>
  | NextResponse<{
      error: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
