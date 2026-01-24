/**
 * Command Board Cards API Endpoints
 *
 * GET    /api/command-board/[boardId]/cards      - List cards for a board
 * POST   /api/command-board/[boardId]/cards      - Create a new card
 */
import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    boardId: string;
  }>;
};
/**
 * GET /api/command-board/[boardId]/cards
 * List cards for a specific board with optional filters
 */
export declare function GET(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      data: {
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        boardId: string;
        cardType: string;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        zIndex: number;
        color: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue;
      }[];
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * POST /api/command-board/[boardId]/cards
 * Create a new card on the specified board
 */
export declare function POST(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      data: {
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        boardId: string;
        cardType: string;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        zIndex: number;
        color: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
