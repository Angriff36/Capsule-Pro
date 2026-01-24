/**
 * Command Board API Endpoints
 *
 * GET    /api/command-board      - List command boards with pagination and filters
 * POST   /api/command-board      - Create a new command board
 */
import { NextResponse } from "next/server";
import type { CommandBoardWithCardsCount } from "./types";
/**
 * GET /api/command-board - List command boards with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: CommandBoardWithCardsCount[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
/**
 * POST /api/command-board - Create a new command board
 */
export declare function POST(request: Request): Promise<
  | NextResponse<CommandBoardWithCardsCount>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
