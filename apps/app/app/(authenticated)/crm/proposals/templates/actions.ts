"use server";

/**
 * Proposal Template CRUD Server Actions
 *
 * Server actions for proposal template management operations.
 * Write operations (create/update/delete/duplicate) route through
 * governed Manifest commands; reads and batch updateMany use direct Prisma
 * (constitution §3/§9/§10).
 */

import type { ProposalTemplate } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/app/lib/decimal";
import { invariant } from "@/app/lib/invariant";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "@/app/lib/tenant";

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
  notes?: string;
  unitPrice: number;
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
  const user = await requireCurrentUser();

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId: user.tenantId }, { deletedAt: null }],
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

  return templates.map(serializeDecimals) as ProposalTemplate[];
}

/**
 * Get proposal template by ID
 */
export async function getProposalTemplateById(id: string) {
  const user = await requireCurrentUser();
  invariant(id, "Template ID is required");

  const template = await database.proposalTemplate.findFirst({
    where: {
      AND: [{ tenantId: user.tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!template) {
    return null;
  }

  return serializeDecimals(template) as ProposalTemplate;
}

/**
 * Get default template for an event type
 */
export async function getDefaultTemplateForEventType(eventType: string) {
  const user = await requireCurrentUser();

  // First try to find a template specifically for this event type
  const eventTypeTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [
        { tenantId: user.tenantId },
        { eventType },
        { isActive: true },
        { deletedAt: null },
      ],
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (eventTypeTemplate) {
    return serializeDecimals(eventTypeTemplate) as ProposalTemplate;
  }

  // Fall back to the global default template
  const defaultTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [
        { tenantId: user.tenantId },
        { isDefault: true },
        { isActive: true },
        { deletedAt: null },
      ],
    },
  });

  return defaultTemplate
    ? (serializeDecimals(defaultTemplate) as ProposalTemplate)
    : null;
}

/**
 * Create a new proposal template
 */
export async function createProposalTemplate(
  input: CreateProposalTemplateInput
) {
  const user = await requireCurrentUser();

  // Validate input
  invariant(input.name?.trim(), "Template name is required");

  // If setting as default, unset any existing default (batch — direct Prisma)
  if (input.isDefault) {
    await database.proposalTemplate.updateMany({
      where: { tenantId: user.tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Governed write: ProposalTemplate.create
  const result = await runManifestCommand({
    entity: "ProposalTemplate",
    command: "create",
    body: {
      name: input.name.trim(),
      description: input.description?.trim() || "",
      eventType: input.eventType?.trim() || "",
      defaultTerms: input.defaultTerms?.trim() || "",
      defaultTaxRate: input.defaultTaxRate ?? 0,
      defaultNotes: input.defaultNotes?.trim() || "",
      defaultLineItems: JSON.stringify(input.defaultLineItems ?? []),
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
      logoUrl: input.branding?.logoUrl?.trim() || "",
      primaryColor: input.branding?.primaryColor?.trim() || "",
      secondaryColor: input.branding?.secondaryColor?.trim() || "",
      accentColor: input.branding?.accentColor?.trim() || "",
      fontFamily: input.branding?.fontFamily?.trim() || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create proposal template");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "ProposalTemplate.create did not return an id");

  // Read back the persisted row to preserve the return shape (§10)
  const template = await database.proposalTemplate.findFirst({
    where: { tenantId: user.tenantId, id: createdId },
  });
  invariant(template, "Created proposal template could not be loaded");

  revalidatePath("/crm/proposals/templates");
  revalidatePath("/crm/proposals/new");

  return serializeDecimals(template) as ProposalTemplate;
}

/**
 * Update a proposal template
 */
export async function updateProposalTemplate(
  id: string,
  input: UpdateProposalTemplateInput
) {
  const user = await requireCurrentUser();
  invariant(id, "Template ID is required");

  const existingTemplate = await database.proposalTemplate.findFirst({
    where: { AND: [{ tenantId: user.tenantId }, { id }, { deletedAt: null }] },
  });
  invariant(existingTemplate, "Template not found");

  // If setting as default, unset any existing default (batch — direct Prisma)
  if (input.isDefault) {
    await database.proposalTemplate.updateMany({
      where: { tenantId: user.tenantId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  // Governed write: ProposalTemplate.update
  const result = await runManifestCommand({
    entity: "ProposalTemplate",
    command: "update",
    body: {
      id,
      name: input.name !== undefined ? input.name.trim() : existingTemplate.name,
      description: input.description !== undefined ? (input.description?.trim() || "") : (existingTemplate.description ?? ""),
      eventType: input.eventType !== undefined ? (input.eventType?.trim() || "") : (existingTemplate.eventType ?? ""),
      defaultTerms: input.defaultTerms !== undefined ? (input.defaultTerms?.trim() || "") : (existingTemplate.defaultTerms ?? ""),
      defaultTaxRate: input.defaultTaxRate ?? Number(existingTemplate.defaultTaxRate),
      defaultNotes: input.defaultNotes !== undefined ? (input.defaultNotes?.trim() || "") : (existingTemplate.defaultNotes ?? ""),
      defaultLineItems: JSON.stringify(input.defaultLineItems ?? existingTemplate.defaultLineItems),
      isActive: input.isActive ?? existingTemplate.isActive,
      isDefault: input.isDefault ?? existingTemplate.isDefault,
      logoUrl: input.branding !== undefined ? (input.branding.logoUrl?.trim() || "") : (existingTemplate.logoUrl ?? ""),
      primaryColor: input.branding !== undefined ? (input.branding.primaryColor?.trim() || "") : (existingTemplate.primaryColor ?? ""),
      secondaryColor: input.branding !== undefined ? (input.branding.secondaryColor?.trim() || "") : (existingTemplate.secondaryColor ?? ""),
      accentColor: input.branding !== undefined ? (input.branding.accentColor?.trim() || "") : (existingTemplate.accentColor ?? ""),
      fontFamily: input.branding !== undefined ? (input.branding.fontFamily?.trim() || "") : (existingTemplate.fontFamily ?? ""),
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update proposal template");
  }

  // Read back the persisted row to preserve the return shape (§10)
  const template = await database.proposalTemplate.findFirst({
    where: { tenantId: user.tenantId, id },
  });
  invariant(template, "Updated proposal template could not be loaded");

  revalidatePath("/crm/proposals/templates");
  revalidatePath("/crm/proposals/new");
  revalidatePath(`/crm/proposals/templates/${id}`);

  return serializeDecimals(template) as ProposalTemplate;
}

/**
 * Delete a proposal template (soft delete via governed command)
 */
export async function deleteProposalTemplate(id: string) {
  const user = await requireCurrentUser();
  invariant(id, "Template ID is required");

  const existingTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [{ tenantId: user.tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingTemplate, "Template not found");

  // Governed write: ProposalTemplate.softDelete
  const result = await runManifestCommand({
    entity: "ProposalTemplate",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete proposal template");
  }

  revalidatePath("/crm/proposals/templates");

  return { success: true };
}

/**
 * Duplicate a proposal template
 */
export async function duplicateProposalTemplate(id: string) {
  const user = await requireCurrentUser();
  invariant(id, "Template ID is required");

  const existingTemplate = await database.proposalTemplate.findFirst({
    where: {
      AND: [{ tenantId: user.tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!existingTemplate) {
    throw new Error("Template not found");
  }

  // Governed write: ProposalTemplate.create with copied fields
  const result = await runManifestCommand({
    entity: "ProposalTemplate",
    command: "create",
    body: {
      name: `${existingTemplate.name} (Copy)`,
      description: existingTemplate.description ?? "",
      eventType: existingTemplate.eventType ?? "",
      defaultTerms: existingTemplate.defaultTerms ?? "",
      defaultTaxRate: Number(existingTemplate.defaultTaxRate),
      defaultNotes: existingTemplate.defaultNotes ?? "",
      defaultLineItems: JSON.stringify(existingTemplate.defaultLineItems),
      isActive: true,
      isDefault: false,
      logoUrl: existingTemplate.logoUrl ?? "",
      primaryColor: existingTemplate.primaryColor ?? "",
      secondaryColor: existingTemplate.secondaryColor ?? "",
      accentColor: existingTemplate.accentColor ?? "",
      fontFamily: existingTemplate.fontFamily ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to duplicate proposal template");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "ProposalTemplate.create did not return an id");

  // Read back the persisted row to preserve the return shape (§10)
  const newTemplate = await database.proposalTemplate.findFirst({
    where: { tenantId: user.tenantId, id: createdId },
  });
  invariant(newTemplate, "Duplicated proposal template could not be loaded");

  revalidatePath("/crm/proposals/templates");

  return serializeDecimals(newTemplate) as ProposalTemplate;
}
