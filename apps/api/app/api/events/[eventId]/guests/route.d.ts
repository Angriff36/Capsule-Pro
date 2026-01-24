import { NextResponse } from "next/server";
/**
 * GET /api/events/[eventId]/guests
 * List all guests for a specific event with pagination
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      eventId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      guests: {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        eventId: string;
        dietaryRestrictions: string[];
        guestName: string;
        guestEmail: string | null;
        guestPhone: string | null;
        isPrimaryContact: boolean;
        allergenRestrictions: string[];
        specialMealRequired: boolean;
        specialMealNotes: string | null;
        tableAssignment: string | null;
        mealPreference: string | null;
      }[];
      pagination: {
        limit: number;
        offset: number;
        total: number;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * POST /api/events/[eventId]/guests
 * Add a new guest to an event
 */
export declare function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      eventId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      guest: {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        eventId: string;
        dietaryRestrictions: string[];
        guestName: string;
        guestEmail: string | null;
        guestPhone: string | null;
        isPrimaryContact: boolean;
        allergenRestrictions: string[];
        specialMealRequired: boolean;
        specialMealNotes: string | null;
        tableAssignment: string | null;
        mealPreference: string | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
