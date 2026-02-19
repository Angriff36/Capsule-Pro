/**
 * @module PublicProposalViewPage
 * @intent Public page for clients to view and respond to proposals without authentication
 * @responsibility Display proposal details, handle accept/reject actions
 * @domain CRM
 * @tags proposals, public, viewing
 * @canonical true
 */

import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { ProposalViewClient } from "./proposal-view-client";

interface PublicProposalViewPageProps {
  params: Promise<{
    token: string;
  }>;
}

const PublicProposalViewPage = async ({
  params,
}: PublicProposalViewPageProps) => {
  const { token } = await params;

  if (!token) {
    notFound();
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
    notFound();
  }

  // Get line items
  const lineItems = await database.proposalLineItem.findMany({
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
  });

  // Get client details
  let client = null;
  if (proposal.clientId) {
    const clientResult = await database.$queryRaw<
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
    `;
    client = clientResult[0] || null;
  }

  // Get lead details if no client
  let lead = null;
  if (!client && proposal.leadId) {
    const leadResult = await database.$queryRaw<
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
    `;
    lead = leadResult[0] || null;
  }

  // Get event details if linked
  let event = null;
  if (proposal.eventId) {
    const eventResult = await database.$queryRaw<
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
    `;
    event = eventResult[0] || null;
  }

  // Get tenant/organization info
  const tenant = await database.account.findFirst({
    where: {
      id: proposal.tenantId,
    },
    select: {
      name: true,
    },
  });

  // Check if expired
  const isExpired =
    proposal.validUntil && new Date(proposal.validUntil) < new Date();

  // Update viewedAt timestamp if this is the first view
  if (!proposal.viewedAt) {
    await database.proposal.update({
      where: {
        tenantId: proposal.tenantId,
        id: proposal.id,
      },
      data: {
        viewedAt: new Date(),
        status: proposal.status === "sent" ? "viewed" : proposal.status,
      },
    });
  }

  // Format decimal values
  const formatDecimal = (value: { toNumber: () => number }) => {
    return value.toNumber();
  };

  return (
    <ProposalViewClient
      client={
        client
          ? {
              company_name: client.company_name,
              first_name: client.first_name,
              last_name: client.last_name,
              email: client.email,
              phone: client.phone,
            }
          : null
      }
      event={
        event
          ? {
              title: event.title,
              eventDate: event.event_date?.toISOString() ?? null,
              venueName: event.venue_name,
            }
          : null
      }
      isExpired={isExpired ?? false}
      lead={
        lead
          ? {
              first_name: lead.first_name,
              last_name: lead.last_name,
              email: lead.email,
              phone: lead.phone,
            }
          : null
      }
      lineItems={lineItems.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        category: item.category,
        description: item.description,
        quantity: formatDecimal(item.quantity),
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: formatDecimal(item.unitPrice),
        totalPrice: formatDecimal(item.totalPrice),
      }))}
      organization={tenant?.name || "Unknown Organization"}
      proposal={{
        id: proposal.id,
        proposalNumber: proposal.proposalNumber,
        title: proposal.title,
        status: proposal.status,
        eventDate: proposal.eventDate?.toISOString() ?? null,
        eventType: proposal.eventType,
        guestCount: proposal.guestCount,
        venueName: proposal.venueName,
        venueAddress: proposal.venueAddress,
        subtotal: formatDecimal(proposal.subtotal),
        taxRate: formatDecimal(proposal.taxRate),
        taxAmount: formatDecimal(proposal.taxAmount),
        discountAmount: formatDecimal(proposal.discountAmount),
        total: formatDecimal(proposal.total),
        notes: proposal.notes,
        termsAndConditions: proposal.termsAndConditions,
        validUntil: proposal.validUntil?.toISOString() ?? null,
        sentAt: proposal.sentAt?.toISOString() ?? null,
        viewedAt: proposal.viewedAt?.toISOString() ?? null,
        acceptedAt: proposal.acceptedAt?.toISOString() ?? null,
        rejectedAt: proposal.rejectedAt?.toISOString() ?? null,
      }}
      publicToken={token}
    />
  );
};

export default PublicProposalViewPage;
