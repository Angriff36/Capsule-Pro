import { type NextRequest, NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    boardId: string;
    cardId: string;
  }>;
};
/**
 * GET /api/command-board/[boardId]/cards/[cardId]
 * Get a single card by ID
 */
export declare function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      id: string;
      tenant_id: string;
      board_id: string;
      title: string;
      content: string | null;
      card_type: string;
      status: string;
      position_x: number;
      position_y: number;
      width: number;
      height: number;
      z_index: number;
      color: string | null;
      metadata: Record<string, unknown>;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }>
>;
/**
 * PUT /api/command-board/[boardId]/cards/[cardId]
 * Update a command board card
 *
 * Supports partial updates of:
 * - title: Card title
 * - content: Card content/description
 * - card_type: Type of card (task, note, alert, info)
 * - status: Card status (pending, in_progress, completed, blocked)
 * - position_x, position_y: Card position on board
 * - width, height: Card dimensions
 * - z_index: Stacking order
 * - color: Card color (hex code)
 * - metadata: Additional JSON metadata
 */
export declare function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<unknown>>;
/**
 * DELETE /api/command-board/[boardId]/cards/[cardId]
 * Soft delete a command board card
 */
export declare function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
