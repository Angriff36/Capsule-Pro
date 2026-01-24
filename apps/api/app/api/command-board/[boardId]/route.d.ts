/**
 * Individual Command Board API Endpoints
 *
 * GET    /api/command-board/[boardId]  - Get a single command board with cards
 * PUT    /api/command-board/[boardId]  - Update a command board
 * DELETE /api/command-board/[boardId]  - Delete a command board (soft delete)
 */
import { NextResponse } from "next/server";
import type { CommandBoardWithCards } from "../types";
type RouteContext = {
  params: Promise<{
    boardId: string;
  }>;
};
/**
 * GET /api/command-board/[boardId] - Get a single command board with cards
 */
export declare function GET(
  _request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<CommandBoardWithCards>
>;
/**
 * PUT /api/command-board/[boardId] - Update a command board
 */
export declare function PUT(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<CommandBoardWithCards>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * DELETE /api/command-board/[boardId] - Soft delete a command board
 */
export declare function DELETE(
  _request: Request,
  context: RouteContext
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
