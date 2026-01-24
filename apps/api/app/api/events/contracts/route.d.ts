/**
 * Event Contracts API Endpoints
 *
 * GET    /api/events/contracts      - List contracts with pagination and filters
 * POST   /api/events/contracts      - Create a new contract
 */
import { NextResponse } from "next/server";
/**
 * GET /api/events/contracts
 * List contracts with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: {
        event: {
          id: string;
          title: string;
          eventDate: Date;
        } | null;
        client: {
          id: string;
          company_name: string | null;
          first_name: string | null;
          last_name: string | null;
        } | null;
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string;
        eventId: string;
        contractNumber: string | null;
        documentUrl: string | null;
        documentType: string | null;
        expiresAt: Date | null;
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
/**
 * POST /api/events/contracts
 * Create a new contract
 */
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: {
        event: {
          id: string;
          title: string;
          eventDate: Date;
        } | null;
        client: {
          id: string;
          company_name: string | null;
          first_name: string | null;
          last_name: string | null;
        } | null;
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string;
        eventId: string;
        contractNumber: string | null;
        documentUrl: string | null;
        documentType: string | null;
        expiresAt: Date | null;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
