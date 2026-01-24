import { type NextRequest, NextResponse } from "next/server";
/**
 * GET /api/kitchen/prep-lists/[id]
 * Get a prep list by ID with all items
 */
export declare function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      stations: any[];
      id: string;
      name: string;
      eventId: string;
      eventTitle: string;
      eventDate: Date;
      batchMultiplier: number;
      dietaryRestrictions: string[];
      status: string;
      totalItems: number;
      totalEstimatedTime: number;
      notes: string | null;
      generatedAt: Date;
      finalizedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>
>;
/**
 * PATCH /api/kitchen/prep-lists/[id]
 * Update a prep list
 */
export declare function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      message: string;
    }>
>;
/**
 * DELETE /api/kitchen/prep-lists/[id]
 * Delete a prep list (soft delete)
 */
export declare function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      message: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
