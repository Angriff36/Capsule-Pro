import { NextResponse } from "next/server";
type Params = Promise<{
  guestId: string;
}>;
/**
 * GET /api/events/guests/[guestId]
 * Get a single guest by ID
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
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
>;
/**
 * PUT /api/events/guests/[guestId]
 * Update a guest
 */
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
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
>;
/**
 * DELETE /api/events/guests/[guestId]
 * Soft delete a guest
 */
export declare function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
