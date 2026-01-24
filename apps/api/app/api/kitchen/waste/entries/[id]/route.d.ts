import { type NextRequest, NextResponse } from "next/server";
type WasteEntryDetail = {
  id: string;
  tenant_id: string;
  ingredient_id: string;
  quantity: string;
  unit: string;
  reason: string;
  notes: string | null;
  event_id: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  ingredient_name: string | null;
  ingredient_category: string | null;
  user_name: string | null;
  event_name: string | null;
};
/**
 * GET /api/kitchen/waste/entries/[id]
 * Get a waste entry by ID
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
  | NextResponse<WasteEntryDetail>
>;
/**
 * PUT /api/kitchen/waste/entries/[id]
 * Update a waste entry
 */
export declare function PUT(
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
 * DELETE /api/kitchen/waste/entries/[id]
 * Delete a waste entry (soft delete)
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
