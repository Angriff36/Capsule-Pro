import { type NextRequest, NextResponse } from "next/server";
/**
 * GET /api/kitchen/prep-lists
 * List all prep lists for the current tenant
 */
export declare function GET(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      prepLists: {
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
        generatedAt: Date;
        finalizedAt: Date | null;
        createdAt: Date;
      }[];
    }>
>;
/**
 * POST /api/kitchen/prep-lists
 * Create a new prep list
 */
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      id: string;
      message: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
