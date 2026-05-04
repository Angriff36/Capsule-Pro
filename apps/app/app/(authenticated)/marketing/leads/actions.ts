"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

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

/**
 * Create a new lead
 */
export async function createLead(input: CreateLeadInput) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(input.contactName?.trim(), "Contact name is required");

  const lead = await database.lead.create({
    data: {
      tenantId,
      contactName: input.contactName.trim(),
      companyName: input.companyName?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      source: input.source?.trim() || null,
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

  return lead;
}
