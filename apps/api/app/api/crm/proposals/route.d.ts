/**
 * Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals      - List proposals with pagination and filters
 * POST   /api/crm/proposals      - Create a new proposal
 */
import { NextResponse } from "next/server";
/**
 * GET /api/crm/proposals
 * List proposals with pagination, search, and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      data: {
        client: {
          id: string;
          company_name: string | null;
          first_name: string | null;
          last_name: string | null;
        } | null;
        lead: {
          id: string;
          companyName: string | null;
          contactName: string;
          contactEmail: string | null;
        } | null;
        lineItems: {
          id: string;
          description: string;
          notes: string | null;
          total: import("@prisma/client/runtime/client").Decimal;
          quantity: import("@prisma/client/runtime/client").Decimal;
          updated_at: Date;
          deleted_at: Date | null;
          created_at: Date;
          sort_order: number;
          tenant_id: string;
          proposal_id: string;
          item_type: string;
          unit_price: import("@prisma/client/runtime/client").Decimal;
        }[];
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string | null;
        leadId: string | null;
        eventType: string | null;
        eventDate: Date | null;
        eventId: string | null;
        guestCount: number | null;
        venueName: string | null;
        venueAddress: string | null;
        proposalNumber: string;
        subtotal: import("@prisma/client/runtime/client").Decimal;
        taxRate: import("@prisma/client/runtime/client").Decimal;
        taxAmount: import("@prisma/client/runtime/client").Decimal;
        discountAmount: import("@prisma/client/runtime/client").Decimal;
        total: import("@prisma/client/runtime/client").Decimal;
        validUntil: Date | null;
        sentAt: Date | null;
        viewedAt: Date | null;
        acceptedAt: Date | null;
        rejectedAt: Date | null;
        termsAndConditions: string | null;
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
/**
 * POST /api/crm/proposals
 * Create a new proposal
 */
export declare function POST(request: Request): Promise<
  | NextResponse<{
      data: {
        client: Record<string, unknown> | null;
        lead: Record<string, unknown> | null;
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string | null;
        leadId: string | null;
        eventType: string | null;
        eventDate: Date | null;
        eventId: string | null;
        guestCount: number | null;
        venueName: string | null;
        venueAddress: string | null;
        proposalNumber: string;
        subtotal: import("@prisma/client/runtime/client").Decimal;
        taxRate: import("@prisma/client/runtime/client").Decimal;
        taxAmount: import("@prisma/client/runtime/client").Decimal;
        discountAmount: import("@prisma/client/runtime/client").Decimal;
        total: import("@prisma/client/runtime/client").Decimal;
        validUntil: Date | null;
        sentAt: Date | null;
        viewedAt: Date | null;
        acceptedAt: Date | null;
        rejectedAt: Date | null;
        termsAndConditions: string | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
