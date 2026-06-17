import {
  listClients,
  listEvents,
  listLeads,
  listProposalLineItems,
  listProposals,
} from "@/app/lib/manifest-client.generated";
/**
 * @module PublicProposalViewPage
 * @intent Public page for clients to view and respond to proposals without authentication
 * @responsibility Display proposal details, handle accept/reject actions
 * @domain CRM
 * @tags proposals, public, viewing
 * @canonical true
 */

import { log } from "@repo/observability/log";
import { notFound } from "next/navigation";
import { apiUrl } from "@/app/lib/api";
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
  let proposal: Awaited<ReturnType<typeof listProposals>>["data"][number] | null = null;
  try {
    proposal =
      (await listProposals()).data.find(
        (row) =>
          !row.deletedAt &&
          (((row as unknown as { publicToken?: string }).publicToken ?? "") ===
            token)
      ) ??
      (await listProposals()).data.find((row) => row.id === token) ??
      null;
  } catch {
    notFound();
  }

  if (!proposal) {
    notFound();
  }

  // Get line items
  let lineItems: Array<{
    id: string;
    itemType: string;
    category: string | null;
    description: string;
    quantity: number | null;
    unitOfMeasure: string | null;
    unitPrice: number | null;
    totalPrice: number | null;
    sortOrder: number | null;
  }>;
  try {
    lineItems = (await listProposalLineItems()).data
      .filter((item) => item.proposalId === proposal.id && !item.deletedAt)
      .map((item) => ({
        id: item.id,
        itemType: item.itemType ?? "",
        category: item.category ?? null,
        description: item.description ?? "",
        quantity: item.quantity ?? null,
        unitOfMeasure: item.unitOfMeasure ?? null,
        unitPrice: item.unitPrice ?? null,
        totalPrice: item.totalPrice ?? item.total ?? null,
        sortOrder: item.sortOrder ?? null,
      }));
  } catch {
    lineItems = [];
  }

  // Get client details
  let client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null = null;
  if (proposal.clientId) {
    try {
      const clientRow = (await listClients()).data.find(
        (row) =>
          row.id === proposal.clientId &&
          row.tenantId === proposal.tenantId &&
          !row.deletedAt
      );
      client = clientRow
        ? {
            company_name: clientRow.companyName ?? null,
            first_name: clientRow.firstName ?? null,
            last_name: clientRow.lastName ?? null,
            email: clientRow.email ?? null,
            phone: clientRow.phone ?? null,
          }
        : null;
    } catch {
      client = null;
    }
  }

  // Get lead details if no client
  let lead: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null = null;
  if (!client && proposal.leadId) {
    try {
      const leadRow = (await listLeads()).data.find(
        (row) =>
          row.id === proposal.leadId &&
          row.tenantId === proposal.tenantId &&
          !row.deletedAt
      );
      lead = leadRow
        ? {
            first_name: leadRow.firstName ?? null,
            last_name: leadRow.lastName ?? null,
            email: leadRow.email ?? null,
            phone: leadRow.phone ?? null,
          }
        : null;
    } catch {
      lead = null;
    }
  }

  // Get event details if linked
  let event: {
    title: string;
    event_date: Date | null;
    venue_name: string | null;
  } | null = null;
  if (proposal.eventId) {
    try {
      const eventRow = (await listEvents()).data.find(
        (row) =>
          row.id === proposal.eventId &&
          row.tenantId === proposal.tenantId &&
          !row.deletedAt
      );
      event = eventRow
        ? {
            title: eventRow.title ?? "",
            event_date: eventRow.eventDate ? new Date(eventRow.eventDate) : null,
            venue_name: eventRow.venueName ?? null,
          }
        : null;
    } catch {
      event = null;
    }
  }

  // Check if expired
  const isExpired =
    proposal.validUntil && new Date(proposal.validUntil) < new Date();

  // Mark proposal as viewed via the public token-validated API route, which
  // executes the governed Proposal.markViewed Manifest command (first view
  // only — the route is a no-op otherwise).
  if (!proposal.viewedAt && proposal.status === "sent") {
    try {
      const response = await fetch(
        apiUrl(`/api/public/proposals/${token}/mark-viewed`),
        { method: "POST", cache: "no-store" }
      );
      if (!response.ok) {
        log.error(
          `Failed to mark proposal as viewed (${response.status}):`,
          await response.text().catch(() => "")
        );
      }
    } catch (err) {
      // Non-critical: markViewed failure must not block page render
      log.error("Failed to mark proposal as viewed via Manifest:", err);
    }
  }

  // Format decimal values — handle null/undefined gracefully
  const formatDecimal = (
    value: { toNumber: () => number } | number | null | undefined
  ): number => {
    if (value == null) {
      return 0;
    }
    if (typeof value === "number") {
      return value;
    }
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
        category: item.category ?? "",
        description: item.description,
        quantity: formatDecimal(item.quantity),
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: formatDecimal(item.unitPrice),
        totalPrice: formatDecimal(item.totalPrice),
      }))}
      organization="Unknown Organization"
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
