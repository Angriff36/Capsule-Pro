/**
 * @module proposals
 * @intent Client-side helpers and types for the Proposals CRM page
 * @responsibility Provide typed fetch wrappers, formatting utilities, and status
 *   helpers consumed by the proposals-page-client component
 * @domain CRM
 * @tags proposals, crm, client-helpers
 * @canonical true
 */

"use client";

import {
  proposalAccept as _proposalAccept,
  proposalReject as _proposalReject,
  proposalSend as _proposalSend,
  proposalWithdraw as _proposalWithdraw,
  getProposal,
  listProposals,
} from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export type DateOrString = Date | string;

export interface ProposalLineItem {
  category: string;
  description: string;
  id: string;
  itemType: string;
  notes: string | null;
  proposalId: string;
  quantity: number;
  sortOrder: number;
  total: number;
  totalPrice: number;
  unitOfMeasure: string | null;
  unitPrice: number;
}

export interface Proposal {
  acceptedAt: DateOrString | null;
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  clientId: string | null;
  clientName?: string | null;
  createdAt: DateOrString;
  deletedAt: DateOrString | null;
  discountAmount: number;
  eventDate: DateOrString | null;
  eventId: string | null;
  eventType: string | null;
  guestCount: number | null;
  id: string;
  lead?: {
    id: string;
    companyName: string | null;
    contactName: string | null;
  } | null;
  leadId: string | null;
  lineItems?: ProposalLineItem[];
  notes: string | null;
  proposalNumber: string;
  publicToken: string | null;
  rejectedAt: DateOrString | null;
  sentAt: DateOrString | null;
  status: ProposalStatus;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  templateId: string | null;
  tenantId: string;
  termsAndConditions: string | null;
  title: string;
  total: number;
  updatedAt: DateOrString;
  validUntil: DateOrString | null;
  venueAddress: string | null;
  venueName: string | null;
  viewedAt: DateOrString | null;
}

export interface ProposalSummary {
  acceptedCount: number;
  pendingCount: number;
  totalCount: number;
  totalValue: number;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchProposals(): Promise<Proposal[]> {
  const result = await listProposals();
  return result.data as Proposal[];
}

export async function fetchProposalById(id: string): Promise<Proposal> {
  const proposal = await getProposal(id);
  if (!proposal) {
    throw new Error("Failed to fetch proposal");
  }
  return proposal as Proposal;
}

// ---------------------------------------------------------------------------
// Command helpers
// ---------------------------------------------------------------------------

export async function sendProposal(id: string): Promise<void> {
  await _proposalSend({ id });
}

export async function acceptProposal(id: string): Promise<void> {
  await _proposalAccept({ id });
}

export async function rejectProposal(id: string): Promise<void> {
  await _proposalReject({ id });
}

export async function withdrawProposal(id: string): Promise<void> {
  await _proposalWithdraw({ id });
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(value: DateOrString | null | undefined): string {
  if (!value) {
    return "\u2014";
  }
  const date = value instanceof Date ? value : new Date(value);
  return dateFormatter.format(date);
}

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatShortDate(
  value: DateOrString | null | undefined
): string {
  if (!value) {
    return "\u2014";
  }
  const date = value instanceof Date ? value : new Date(value);
  return shortDateFormatter.format(date);
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type StatusVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "coral";

const STATUS_VARIANT_MAP: Record<ProposalStatus, StatusVariant> = {
  draft: "secondary",
  sent: "outline",
  viewed: "outline",
  accepted: "success",
  rejected: "destructive",
  withdrawn: "coral",
  expired: "secondary",
};

const STATUS_LABEL_MAP: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

export function getStatusColor(status: ProposalStatus): StatusVariant {
  return STATUS_VARIANT_MAP[status] ?? "secondary";
}

export function getStatusLabel(status: ProposalStatus): string {
  return STATUS_LABEL_MAP[status] ?? status;
}

export function getClientName(proposal: Proposal): string {
  if (proposal.client?.company_name) {
    return proposal.client.company_name;
  }
  if (proposal.client) {
    const personName = [proposal.client.first_name, proposal.client.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (personName) {
      return personName;
    }
  }
  if (proposal.clientName) {
    return proposal.clientName;
  }
  return "No client";
}
