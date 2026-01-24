import { type NextRequest, NextResponse } from "next/server";
/**
 * PATCH /api/kitchen/prep-lists/items/[id]
 * Update a prep list item (quantities, completion, etc.)
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
 * DELETE /api/kitchen/prep-lists/items/[id]
 * Delete a prep list item (soft delete)
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
