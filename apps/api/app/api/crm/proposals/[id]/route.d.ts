/**
 * Single Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals/[id]      - Get a single proposal
 * PUT    /api/crm/proposals/[id]      - Update a proposal
 * DELETE /api/crm/proposals/[id]      - Soft delete a proposal
 */
import { NextResponse } from "next/server";
type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * GET /api/crm/proposals/[id]
 * Get a single proposal by ID
 */
export declare function GET(
  request: Request,
  { params }: RouteParams
): Promise<
  | NextResponse<{
      data: {
        client: Record<string, unknown> | null;
        lead: Record<string, unknown> | null;
        event: Record<string, unknown> | null;
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
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * PUT /api/crm/proposals/[id]
 * Update a proposal
 */
export declare function PUT(
  request: Request,
  { params }: RouteParams
): Promise<
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
/**
 * DELETE /api/crm/proposals/[id]
 * Soft delete a proposal
 */
export declare function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<
  NextResponse<{
    message: any;
  }>
>;
//# sourceMappingURL=route.d.ts.map
