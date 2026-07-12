/**
 * Public Proposal Access API
 *
 * GET /api/public/proposals/[token] - Get proposal info by public token (no auth required)
 *
 * This endpoint allows clients to access their proposal for viewing without authentication.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { runManifestCommand } from "@/lib/manifest/execute-command";

type Params = Promise<{ token: string }>;

/**
 * GET /api/public/proposals/[token]
 * Get proposal info by public token
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: "Invalid proposal link" },
        { status: 400 }
      );
    }

    // Find proposal by public token
    const proposal = await database.proposal.findFirst({
      where: {
        publicToken: token,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        proposalNumber: true,
        title: true,
        status: true,
        eventDate: true,
        eventType: true,
        guestCount: true,
        venueName: true,
        venueAddress: true,
        subtotal: true,
        taxRate: true,
        taxAmount: true,
        discountAmount: true,
        total: true,
        notes: true,
        termsAndConditions: true,
        validUntil: true,
        sentAt: true,
        viewedAt: true,
        acceptedAt: true,
        rejectedAt: true,
        clientId: true,
        leadId: true,
        eventId: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found or link has expired" },
        { status: 404 }
      );
    }

    // Check if proposal has expired (validUntil)
    if (proposal.validUntil && new Date(proposal.validUntil) < new Date()) {
      return NextResponse.json(
        { message: "This proposal has expired", expired: true },
        { status: 410 }
      );
    }

    // Fetch line items, client/lead/event details, and org in ONE batch
    // instead of 5 serial round-trips. Array order is chosen to preserve the
    // original serial $queryRaw call order (client → lead → event); Promise.all
    // still runs them concurrently. `lead` is fetched only when there is no
    // clientId — equivalent to the original `!client` gate, since `client` is
    // populated only when `clientId` is present.
    const [lineItems, client, lead, event, tenant] = await Promise.all([
      database.proposalLineItem.findMany({
        where: {
          proposalId: proposal.id,
          tenantId: proposal.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          itemType: true,
          category: true,
          description: true,
          quantity: true,
          unitOfMeasure: true,
          unitPrice: true,
          totalPrice: true,
          sortOrder: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      }),
      proposal.clientId
        ? database.$queryRaw<
            Array<{
              company_name: string | null;
              first_name: string | null;
              last_name: string | null;
              email: string | null;
              phone: string | null;
            }>
          >`
            SELECT company_name, first_name, last_name, email, phone
            FROM tenant_crm.clients
            WHERE id = ${proposal.clientId}
              AND tenant_id = ${proposal.tenantId}
              AND deleted_at IS NULL
          `
        : Promise.resolve(null),
      !proposal.clientId && proposal.leadId
        ? database.$queryRaw<
            Array<{
              first_name: string | null;
              last_name: string | null;
              email: string | null;
              phone: string | null;
            }>
          >`
            SELECT first_name, last_name, email, phone
            FROM tenant_crm.leads
            WHERE id = ${proposal.leadId}
              AND tenant_id = ${proposal.tenantId}
              AND deleted_at IS NULL
          `
        : Promise.resolve(null),
      proposal.eventId
        ? database.$queryRaw<
            Array<{
              title: string;
              event_date: Date | null;
              venue_name: string | null;
            }>
          >`
            SELECT title, event_date, venue_name
            FROM tenant_kitchen.events
            WHERE id = ${proposal.eventId}
              AND tenant_id = ${proposal.tenantId}
              AND deleted_at IS NULL
          `
        : Promise.resolve(null),
      database.account.findFirst({
        where: {
          id: proposal.tenantId,
        },
        select: {
          name: true,
        },
      }),
    ]);

    // Update viewedAt timestamp if this is the first view (governed via Manifest)
    if (!proposal.viewedAt) {
      try {
        // Synthetic system-user context for public route (no Clerk auth)
        const adminUser = await database.user.findFirst({
          where: {
            tenantId: proposal.tenantId,
            role: { in: ["owner", "admin"] },
            deletedAt: null,
          },
          select: { id: true, role: true },
        });
        const systemUser = {
          id: adminUser?.id ?? "system",
          tenantId: proposal.tenantId,
          role: adminUser?.role ?? "admin",
        };
        await runManifestCommand({
          entity: "Proposal",
          command: "markViewed",
          body: {
            id: proposal.id,
            tenantId: proposal.tenantId,
            viewedByInfo: "public-link",
          },
          user: systemUser,
        });
      } catch (err) {
        // Non-fatal — markViewed failure must not block the GET response
        log.error("Failed to mark proposal as viewed via Manifest:", err);
      }
    }

    return NextResponse.json({
      proposal: {
        id: proposal.id,
        proposalNumber: proposal.proposalNumber,
        title: proposal.title,
        status: proposal.status,
        eventDate: proposal.eventDate,
        eventType: proposal.eventType,
        guestCount: proposal.guestCount,
        venueName: proposal.venueName,
        venueAddress: proposal.venueAddress,
        subtotal: proposal.subtotal,
        taxRate: proposal.taxRate,
        taxAmount: proposal.taxAmount,
        discountAmount: proposal.discountAmount,
        total: proposal.total,
        notes: proposal.notes,
        termsAndConditions: proposal.termsAndConditions,
        validUntil: proposal.validUntil,
        sentAt: proposal.sentAt,
        viewedAt: proposal.viewedAt,
        acceptedAt: proposal.acceptedAt,
        rejectedAt: proposal.rejectedAt,
      },
      lineItems,
      client: client?.[0] || null,
      lead: lead?.[0] || null,
      event: event?.[0] || null,
      organization: tenant?.name || "Unknown Organization",
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching public proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
