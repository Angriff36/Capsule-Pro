"use server";

/**
 * Proposal Template CRUD Server Actions
 *
 * Server actions for proposal template management operations
 */

import { auth } from "@repo/auth/server";
import type { ProposalTemplate } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

// Types for template operations
export interface ProposalTemplateFilters {
  search?: string;
  eventType?: string;
  isActive?: boolean;
}

export interface DefaultLineItem {
  sortOrder: number;
  itemType: string;
  category: string;
  description: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  notes?: string;
}

export interface ProposalBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
}

export interface CreateProposalTemplateInput {
  name: string;
  description?: string | null;
  eventType?: string | null;
  defaultTerms?: string | null;
  defaultTaxRate?: number | null;
  defaultNotes?: string | null;
  defaultLineItems?: DefaultLineItem[];
  isActive?: boolean;
  isDefault?: boolean;
  branding?: ProposalBrandingInput;
}

export interface UpdateProposalTemplateInput {
  name?: string;
  description?: string | null;
  eventType?: string | null;
  defaultTerms?: string | null;
  defaultTaxRate?: number | null;
  defaultNotes?: string | null;
  defaultLineItems?: DefaultLineItem[];
  isActive?: boolean;
  isDefault?: boolean;
  branding?: ProposalBrandingInput;
}

/**
 * Get list of proposal templates with filters
 */
export async function getProposalTemplates(
  filters: ProposalTemplateFilters = {}
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { deletedAt: null }],
  };

  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    (whereClause.AND as Record<string, unknown>[]).push({
      OR: [
        { name: { contains: searchLower, mode: "insensitive" } },
        { description: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }

  // Add event type filter
  if (filters.eventType) {
    (whereClause.AND as Record<string, unknown>[]).push({
      eventType: filters.eventType,
    });
  }

  // Add active filter
  if (filters.isActive !== undefined) {
    (whereClause.AND as Record<string, unknown>[]).push({
      isActive: filters.isActive,
    });
  }

  const templates = await database.proposalTemplate.findMany({
    where: whereClause,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return templates as ProposalTemplate[];
}

/**
 * Get proposal template by ID
 */
export async function getProposalTemplateById(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Template ID is required");

  const template = await database.proposalTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!template) {
    return null;
  }

  return template as ProposalTemplate;
}

/**
 * Get default template for an event type
 */
export async function getDefaultTemplateForEventType(eventType: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  // First try to find a template specifically for this event type
  const eventTypeTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [
        { tenantId },
        { eventType },
        { isActive: true },
        { deletedAt: null },
      ],
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (eventTypeTemplate) {
    return eventTypeTemplate as ProposalTemplate;
  }

  // Fall back to the global default template
  const defaultTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [
        { tenantId },
        { isDefault: true },
        { isActive: true },
        { deletedAt: null },
      ],
    },
  });

  return defaultTemplate as ProposalTemplate | null;
}

/**
 * Create a new proposal template
 */
export async function createProposalTemplate(
  input: CreateProposalTemplateInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  // Validate input
  invariant(input.name?.trim(), "Template name is required");

  // If setting as default, unset any existing default
  if (input.isDefault) {
    await database.proposalTemplate.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await database.proposalTemplate.create({
    data: {
      tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      eventType: input.eventType?.trim() || null,
      defaultTerms: input.defaultTerms?.trim() || null,
      defaultTaxRate: input.defaultTaxRate ?? 0,
      defaultNotes: input.defaultNotes?.trim() || null,
      defaultLineItems: JSON.parse(
        JSON.stringify(input.defaultLineItems ?? [])
      ),
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
      // Branding fields
      logoUrl: input.branding?.logoUrl?.trim() || null,
      primaryColor: input.branding?.primaryColor?.trim() || null,
      secondaryColor: input.branding?.secondaryColor?.trim() || null,
      accentColor: input.branding?.accentColor?.trim() || null,
      fontFamily: input.branding?.fontFamily?.trim() || null,
    },
  });

  revalidatePath("/crm/proposals/templates");
  revalidatePath("/crm/proposals/new");

  return template as ProposalTemplate;
}

/**
 * Build update data object from input
 */
function buildUpdateData(
  input: UpdateProposalTemplateInput
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    data.name = input.name?.trim();
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.eventType !== undefined) {
    data.eventType = input.eventType?.trim() || null;
  }
  if (input.defaultTerms !== undefined) {
    data.defaultTerms = input.defaultTerms?.trim() || null;
  }
  if (input.defaultTaxRate !== undefined) {
    data.defaultTaxRate = input.defaultTaxRate ?? 0;
  }
  if (input.defaultNotes !== undefined) {
    data.defaultNotes = input.defaultNotes?.trim() || null;
  }
  if (input.defaultLineItems !== undefined) {
    data.defaultLineItems = JSON.parse(JSON.stringify(input.defaultLineItems));
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }
  if (input.isDefault !== undefined) {
    data.isDefault = input.isDefault;
  }

  if (input.branding !== undefined) {
    data.logoUrl = input.branding.logoUrl?.trim() || null;
    data.primaryColor = input.branding.primaryColor?.trim() || null;
    data.secondaryColor = input.branding.secondaryColor?.trim() || null;
    data.accentColor = input.branding.accentColor?.trim() || null;
    data.fontFamily = input.branding.fontFamily?.trim() || null;
  }

  return data;
}

/**
 * Update a proposal template
 */
export async function updateProposalTemplate(
  id: string,
  input: UpdateProposalTemplateInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Template ID is required");

  const existingTemplate = await database.proposalTemplate.findFirst({
    where: { AND: [{ tenantId }, { id }, { deletedAt: null }] },
  });
  invariant(existingTemplate, "Template not found");

  if (input.isDefault) {
    await database.proposalTemplate.updateMany({
      where: { tenantId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const template = await database.proposalTemplate.update({
    where: { id },
    data: buildUpdateData(input),
  });

  revalidatePath("/crm/proposals/templates");
  revalidatePath("/crm/proposals/new");
  revalidatePath(`/crm/proposals/templates/${id}`);

  return template as ProposalTemplate;
}

/**
 * Delete a proposal template (soft delete)
 */
export async function deleteProposalTemplate(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Template ID is required");

  const existingTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingTemplate, "Template not found");

  await database.proposalTemplate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/crm/proposals/templates");

  return { success: true };
}

/**
 * Duplicate a proposal template
 */
export async function duplicateProposalTemplate(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Template ID is required");

  const existingTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!existingTemplate) {
    throw new Error("Template not found");
  }

  const newTemplate = await database.proposalTemplate.create({
    data: {
      tenantId,
      name: `${existingTemplate.name} (Copy)`,
      description: existingTemplate.description,
      eventType: existingTemplate.eventType,
      defaultTerms: existingTemplate.defaultTerms,
      defaultTaxRate: existingTemplate.defaultTaxRate,
      defaultNotes: existingTemplate.defaultNotes,
      defaultLineItems: JSON.parse(
        JSON.stringify(existingTemplate.defaultLineItems)
      ),
      isActive: true,
      isDefault: false,
      // Copy branding fields
      logoUrl: existingTemplate.logoUrl,
      primaryColor: existingTemplate.primaryColor,
      secondaryColor: existingTemplate.secondaryColor,
      accentColor: existingTemplate.accentColor,
      fontFamily: existingTemplate.fontFamily,
    },
  });

  revalidatePath("/crm/proposals/templates");

  return newTemplate as ProposalTemplate;
}
