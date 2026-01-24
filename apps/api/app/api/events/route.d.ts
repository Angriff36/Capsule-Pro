/**
 * @module EventsAPI
 * @intent List events with pagination and filtering
 * @responsibility Provide paginated list of events for the current tenant
 * @domain Events
 * @tags events, api, list
 * @canonical true
 */
import { NextResponse } from "next/server";
/**
 * GET /api/events
 * List events with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      data: {
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        eventType: string;
        eventDate: Date;
        locationId: string | null;
        eventNumber: string | null;
        guestCount: number;
        venueName: string | null;
        venueAddress: string | null;
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
