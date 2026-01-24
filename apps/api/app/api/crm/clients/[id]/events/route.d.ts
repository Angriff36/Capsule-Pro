/**
 * Client Event History API Endpoints
 *
 * GET /api/crm/clients/[id]/events - Get client's event history
 */
import { NextResponse } from "next/server";
/**
 * GET /api/crm/clients/[id]/events
 * Get event history for a client
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      data: {
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        eventType: string;
        eventDate: Date;
        guestCount: number;
        venueName: string | null;
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
//# sourceMappingURL=route.d.ts.map
