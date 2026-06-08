/**
 * @module leads
 * @intent Client-side helpers and types for the Marketing Leads page
 * @responsibility Provide typed fetch wrappers, command helpers, formatting
 *   utilities, and status helpers consumed by the leads-page-client component
 * @domain Marketing / CRM
 * @tags leads, marketing, crm, client-helpers
 * @canonical true
 */

"use client";

import { formatCurrency as _formatCurrency } from "@repo/design-system/lib/format-currency";
import { apiFetch } from "@/app/lib/api";
import {
  leadCreate,
  listLeads,
  getLead,
} from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "disqualified";

export type DateOrString = Date | string;

export interface Lead {
  id: string;
  tenantId: string;
  source: string | null;
  companyName: string | null;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  eventType: string | null;
  eventDate: DateOrString | null;
  estimatedGuests: number | null;
  estimatedValue: number | null;
  status: string;
  assignedTo: string | null;
  notes: string | null;
  convertedToClientId: string | null;
  convertedAt: DateOrString | null;
  createdAt: DateOrString;
  updatedAt: DateOrString;
  deletedAt: DateOrString | null;
  /**
   * Marketing spec FR-129: when contactEmail matches an existing Client.email
   * or another Lead.contactEmail in the same tenant, the row is flagged so the
   * list can render a "POSSIBLE DUPLICATE" annotation. Spec: leads are created
   * regardless; this is annotation, not rejection.
   */
  possibleDuplicate?: boolean;
}

export interface LeadSummary {
  totalCount: number;
  newCount: number;
  contactedCount: number;
  qualifiedCount: number;
  convertedCount: number;
  disqualifiedCount: number;
  totalEstimatedValue: number;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchLeads(): Promise<Lead[]> {
  const result = await listLeads({ limit: 200 });
  return result.data as Lead[];
}

export async function fetchLeadById(id: string): Promise<Lead> {
  const lead = await getLead(id);
  if (!lead) throw new Error("Failed to fetch lead");
  return lead as Lead;
}

// ---------------------------------------------------------------------------
// Command helpers
// ---------------------------------------------------------------------------

async function executeCommand(
  command: string,
  instanceId: string,
  body?: Record<string, unknown>
): Promise<Response> {
  const response = await apiFetch(`/api/crm/leads/commands/${command}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, ...body }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        `Failed to execute ${command} on lead`
    );
  }
  return response;
}

export async function createLead(data: {
  contactName: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  source?: string;
  eventType?: string;
  eventDate?: string;
  estimatedGuests?: number;
  estimatedValue?: number;
  notes?: string;
}): Promise<void> {
  await leadCreate(data);
}

export async function updateLead(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  await executeCommand("update", id, data);
}

export async function convertLeadToClient(id: string): Promise<void> {
  await executeCommand("convert-to-client", id);
}

export async function disqualifyLead(id: string): Promise<void> {
  await executeCommand("disqualify", id);
}

export async function archiveLead(id: string): Promise<void> {
  await executeCommand("archive", id);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Re-export shared formatCurrency (whole-dollar, em dash for null) */
export function formatCurrency(amount: number | null | undefined): string {
  return _formatCurrency(amount, { fractionDigits: 0, nullDisplay: "\u2014" });
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(value: DateOrString | null | undefined): string {
  if (!value) return "\u2014";
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
  if (!value) return "\u2014";
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

const STATUS_VARIANT_MAP: Record<LeadStatus, StatusVariant> = {
  new: "default",
  contacted: "outline",
  qualified: "success",
  converted: "success",
  disqualified: "secondary",
};

const STATUS_LABEL_MAP: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  disqualified: "Disqualified",
};

export function getStatusColor(status: LeadStatus): StatusVariant {
  return STATUS_VARIANT_MAP[status] ?? "secondary";
}

export function getStatusLabel(status: string): string {
  return (
    STATUS_LABEL_MAP[status as LeadStatus] ??
    status.charAt(0).toUpperCase() + status.slice(1)
  );
}

export function getLeadDisplayName(lead: Lead): string {
  return lead.companyName || lead.contactName || "Unknown lead";
}
