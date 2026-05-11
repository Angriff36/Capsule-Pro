/**
 * @module use-proposals
 * @intent Client-side helpers and types for the Proposals CRM page
 * @responsibility Provide typed fetch wrappers, formatting utilities, and status
 *   helpers consumed by the proposals-page-client component
 * @domain CRM
 * @tags proposals, crm, client-helpers
 * @canonical true
 */

"use client";

import { apiFetch } from "@/app/lib/api";

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

export interface ProposalLineItem {
  id: string;
  proposalId: string;
  itemType: string;
  category: string;
  description: string;
  quantity: number;
  unitOfMeasure: string | null;
  unitPrice: number;
  total: number;
  totalPrice: number;
  sortOrder: number;
  notes: string | null;
}

export type DateOrString = Date | string;

export interface Proposal {
  id: string;
  tenantId: string;
  proposalNumber: string;
  templateId: string | null;
  clientId: string | null;
  leadId: string | null;
  eventId: string | null;
  title: string;
  eventDate: DateOrString | null;
  eventType: string | null;
  guestCount: number | null;
  venueName: string | null;
  venueAddress: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  discountAmount: number;
  status: ProposalStatus;
  publicToken: string | null;
  validUntil: DateOrString | null;
  sentAt: DateOrString | null;
  viewedAt: DateOrString | null;
  acceptedAt: DateOrString | null;
  rejectedAt: DateOrString | null;
  notes: string | null;
  termsAndConditions: string | null;
  createdAt: DateOrString;
  updatedAt: DateOrString;
  deletedAt: DateOrString | null;
  clientName?: string | null;
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  lead?: {
    id: string;
    companyName: string | null;
    contactName: string | null;
  } | null;
  lineItems?: ProposalLineItem[];
}

export interface ProposalSummary {
  totalCount: number;
  totalValue: number;
  acceptedCount: number;
  pendingCount: number;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchProposals(): Promise<Proposal[]> {
  const response = await apiFetch("/api/crm/proposals/list");
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || "Failed to fetch proposals"
    );
  }
  const data = (await response.json()) as { proposals: Proposal[] };
  return data.proposals;
}

export async function fetchProposalById(id: string): Promise<Proposal> {
  const response = await apiFetch(`/api/crm/proposals/${id}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || "Failed to fetch proposal"
    );
  }
  return (await response.json()) as Proposal;
}

// ---------------------------------------------------------------------------
// Command helpers
// ---------------------------------------------------------------------------

async function executeCommand(
  command: string,
  instanceId: string
): Promise<Response> {
  const response = await apiFetch(`/api/crm/proposals/commands/${command}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        `Failed to execute ${command} on proposal`
    );
  }
  return response;
}

export async function sendProposal(id: string): Promise<void> {
  await executeCommand("send", id);
}

export async function acceptProposal(id: string): Promise<void> {
  await executeCommand("accept", id);
}

export async function rejectProposal(id: string): Promise<void> {
  await executeCommand("reject", id);
}

export async function withdrawProposal(id: string): Promise<void> {
  await executeCommand("withdraw", id);
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
