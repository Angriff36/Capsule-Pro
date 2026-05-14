"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

// Marketing spec FR-501: closed enum, immutable after creation.
// `website` is reserved for the public infrastructure-allowlisted endpoint (FR-505).
export const LEAD_SOURCES = ["website", "manual", "import"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface CreateLeadInput {
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
  assignedTo?: string;
}

export interface CreateLeadResult {
  lead: Awaited<ReturnType<typeof database.lead.create>>;
  // FR-129: when contactEmail matches an existing Client.email or Lead.contactEmail,
  // we create the lead anyway and surface a "POSSIBLE DUPLICATE" annotation.
  possibleDuplicate: boolean;
  duplicateReason?: "client_email" | "lead_email";
}

async function detectEmailDuplicate(
  tenantId: string,
  contactEmail: string
): Promise<CreateLeadResult["duplicateReason"]> {
  const normalized = contactEmail.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  const clientHit = await database.client.findFirst({
    where: { tenantId, email: { equals: normalized, mode: "insensitive" } },
    select: { id: true },
  });
  if (clientHit) {
    return "client_email";
  }
  const leadHit = await database.lead.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      contactEmail: { equals: normalized, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (leadHit) {
    return "lead_email";
  }
  return undefined;
}

export async function createLead(
  input: CreateLeadInput
): Promise<CreateLeadResult> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
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

  const contactEmail = input.contactEmail?.trim() || null;
  const duplicateReason = contactEmail
    ? await detectEmailDuplicate(tenantId, contactEmail)
    : undefined;

  const lead = await database.lead.create({
    data: {
      tenantId,
      contactName: input.contactName.trim(),
      companyName: input.companyName?.trim() || null,
      contactEmail,
      contactPhone: input.contactPhone?.trim() || null,
      source,
      eventType: input.eventType?.trim() || null,
      eventDate: input.eventDate ? new Date(input.eventDate) : null,
      estimatedGuests: input.estimatedGuests || null,
      estimatedValue: input.estimatedValue || null,
      notes: input.notes?.trim() || null,
      assignedTo: input.assignedTo || null,
      status: "new",
    },
  });

  revalidatePath("/marketing/leads");

  return {
    lead,
    possibleDuplicate: Boolean(duplicateReason),
    duplicateReason,
  };
}
