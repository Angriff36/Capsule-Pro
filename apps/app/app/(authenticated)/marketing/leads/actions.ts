"use server";
import { listClients, listLeads } from "@/app/lib/manifest-client.generated";
import type { Lead } from "@/app/lib/manifest-types.generated";

import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

// Marketing spec FR-501: closed enum, immutable after creation.
// `website` is reserved for the public infrastructure-allowlisted endpoint (FR-505).
// not exported: "use server" modules may only export async functions at runtime
const LEAD_SOURCES = ["website", "manual", "import"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface CreateLeadInput {
  assignedTo?: string;
  companyName?: string;
  contactEmail?: string;
  contactName: string;
  contactPhone?: string;
  estimatedGuests?: number;
  estimatedValue?: number;
  eventDate?: string;
  eventType?: string;
  notes?: string;
  source?: string;
}

export interface CreateLeadResult {
  duplicateReason?: "client_email" | "lead_email";
  lead: Lead;
  // FR-129: when contactEmail matches an existing Client.email or Lead.contactEmail,
  // we create the lead anyway and surface a "POSSIBLE DUPLICATE" annotation.
  possibleDuplicate: boolean;
}

async function detectEmailDuplicate(
  contactEmail: string
): Promise<CreateLeadResult["duplicateReason"]> {
  const normalized = contactEmail.trim().toLowerCase();
  if (!normalized) {
    return;
  }
  const clientHit = (await listClients()).data[0] ?? null;
  if (clientHit) {
    return "client_email";
  }
  const leadHit = (await listLeads()).data[0] ?? null;
  if (leadHit) {
    return "lead_email";
  }
  return;
}

export async function createLead(
  input: CreateLeadInput
): Promise<CreateLeadResult> {
  // Resolve the actor + tenant. requireCurrentUser throws when unauthenticated
  // and supplies the id/role the governed Lead.create command needs for
  // permission + audit context (constitution §19 Clerk→Manifest context).
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  invariant(input.contactName?.trim(), "Contact name is required");

  // Source: closed enum per FR-501. Operator surface defaults to "manual"
  // because "website" is reserved for the public form and "import" is owned by
  // CSV upload tooling. Reject anything outside the enum loudly so callers see
  // the spec violation rather than silently coercing.
  const rawSource = input.source?.trim().toLowerCase();
  if (rawSource && !(LEAD_SOURCES as readonly string[]).includes(rawSource)) {
    throw new Error(`Lead source must be one of: ${LEAD_SOURCES.join(", ")}`);
  }
  const source: LeadSource = (rawSource as LeadSource) || "manual";

  // FR-129 pre-validation: duplicate annotation is advisory (we still create).
  // This read precedes the governed write — reads may use Prisma (constitution §10).
  const contactEmail = input.contactEmail?.trim() || null;
  const duplicateReason = contactEmail
    ? await detectEmailDuplicate(contactEmail)
    : undefined;

  // Governed write: Lead.create runs through the Manifest runtime — no direct
  // prisma.lead.create (constitution §3/§9). The command auto-sets status="new"
  // and stamps timestamps. eventDate is passed as epoch-ms (the store coerces
  // number→Date and null→null via asNullableDate), matching the API lead route.
  // Empty optional strings/numbers are sent as the Manifest entity defaults
  // ("" / 0) so the canonical command shape is the single source of truth.
  const result = await runManifestCommand({
    entity: "Lead",
    command: "create",
    body: {
      source,
      companyName: input.companyName?.trim() || "",
      contactName: input.contactName.trim(),
      contactEmail: contactEmail ?? "",
      contactPhone: input.contactPhone?.trim() || "",
      eventType: input.eventType?.trim() || "",
      eventDate: input.eventDate ? new Date(input.eventDate).getTime() : null,
      estimatedGuests: input.estimatedGuests || 0,
      estimatedValue: input.estimatedValue || 0,
      assignedTo: input.assignedTo || "",
      notes: input.notes?.trim() || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create lead");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "Lead.create did not return an id");

  // Read back the persisted row to preserve the CreateLeadResult.lead shape.
  const lead = (await listLeads()).data[0] ?? null;
  invariant(lead, "Created lead could not be loaded");

  revalidatePath("/marketing/leads");

  return {
    lead,
    possibleDuplicate: Boolean(duplicateReason),
    duplicateReason,
  };
}
