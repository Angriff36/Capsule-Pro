"use server";

/**
 * Proposal Template CRUD Server Actions
 *
 * Server actions for proposal template management operations.
 * All write operations — create/update/delete/duplicate AND the single-default
 * demotion — route through governed Manifest commands; reads use direct Prisma
 * (constitution §3/§9/§10).
 */

import type { ProposalTemplate } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/app/lib/decimal";
import { invariant } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

// Types for template operations
export interface ProposalTemplateFilters {
  eventType?: string;
  isActive?: boolean;
  search?: string;
}

export interface DefaultLineItem {
  category: string;
  description: string;
  itemType: string;
  notes?: string;
  quantity: number;
  sortOrder: number;
  unitOfMeasure?: string;
  unitPrice: number;
}

export interface ProposalBrandingInput {
  accentColor?: string | null;
  fontFamily?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface CreateProposalTemplateInput {
  branding?: ProposalBrandingInput;
  defaultLineItems?: DefaultLineItem[];
  defaultNotes?: string | null;
  defaultTaxRate?: number | null;
  defaultTerms?: string | null;
  description?: string | null;
  eventType?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  name: string;
}

export interface UpdateProposalTemplateInput {
  branding?: ProposalBrandingInput;
  defaultLineItems?: DefaultLineItem[];
  defaultNotes?: string | null;
  defaultTaxRate?: number | null;
  defaultTerms?: string | null;
  description?: string | null;
  eventType?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  name?: string;
}

/**
 * Demote any currently-default templates to non-default via the governed
 * ProposalTemplate.update command (constitution §9 — replaces a direct
 * prisma.updateMany batch write). Each sibling's existing field values are
 * re-passed with isDefault=false so the full-mutate `update` command clobbers
 * nothing else. The read of the current defaults is an allowed read path (§10).
 */
async function demoteDefaultProposalTemplates(
  actor: { id: string; role: string; tenantId: string },
  excludeId?: string
): Promise<void> {
  const currentDefaults = await database.proposalTemplate.findMany({
    where: {
      tenantId: actor.tenantId,
      isDefault: true,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  for (const tpl of currentDefaults) {
    const result = await runManifestCommand({
      entity: "ProposalTemplate",
      command: "update",
      body: {
        id: tpl.id,
        name: tpl.name,
        description: tpl.description ?? "",
        eventType: tpl.eventType ?? "",
        defaultTerms: tpl.defaultTerms ?? "",
        defaultTaxRate: Number(tpl.defaultTaxRate),
        defaultNotes: tpl.defaultNotes ?? "",
        defaultLineItems: tpl.defaultLineItems ?? "[]",
        isActive: tpl.isActive,
        isDefault: false,
        logoUrl: tpl.logoUrl ?? "",
        primaryColor: tpl.primaryColor ?? "",
        secondaryColor: tpl.secondaryColor ?? "",
        accentColor: tpl.accentColor ?? "",
        fontFamily: tpl.fontFamily ?? "",
      },
      user: actor,
    });
    if (!result.ok) {
      throw new Error(
        result.message ||
          `Failed to clear default flag on proposal template ${tpl.id}`
      );
    }
  }
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

  // Select ONLY the fields the two consumers read (templates/page.tsx list +
  // proposal-form.tsx dropdown): id, name, description, eventType, isActive,
  // isDefault, defaultLineItems (the last only for a `.length` badge). Drops 12
  // unused columns incl. the heavy `defaultTerms` @db.Text + 4 branding strings.
  // No cast to ProposalTemplate[]: serializeDecimals<T> preserves T, so the
  // inferred subset return type makes a future consumer reading a dropped field
  // a compile error instead of a silent undefined.
  const templates = await database.proposalTemplate.findMany({
    where: whereClause,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      eventType: true,
      isActive: true,
      isDefault: true,
      defaultLineItems: true,
    },
  });

  return templates.map(serializeDecimals);
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

  // If setting as default, demote any existing default (governed §9)
  if (input.isDefault) {
    await demoteDefaultProposalTemplates({
      id: user.id,
      role: user.role,
      tenantId: user.tenantId,
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

  // If setting as default, demote any other existing default (governed §9)
  if (input.isDefault) {
    await demoteDefaultProposalTemplates(
      { id: user.id, role: user.role, tenantId: user.tenantId },
      id
    );
  }

  // Governed write: ProposalTemplate.update
  const result = await runManifestCommand({
    entity: "ProposalTemplate",
    command: "update",
    body: {
      id,
      name:
        input.name === undefined ? existingTemplate.name : input.name.trim(),
      description:
        input.description === undefined
          ? (existingTemplate.description ?? "")
          : input.description?.trim() || "",
      eventType:
        input.eventType === undefined
          ? (existingTemplate.eventType ?? "")
          : input.eventType?.trim() || "",
      defaultTerms:
        input.defaultTerms === undefined
          ? (existingTemplate.defaultTerms ?? "")
          : input.defaultTerms?.trim() || "",
      defaultTaxRate:
        input.defaultTaxRate ?? Number(existingTemplate.defaultTaxRate),
      defaultNotes:
        input.defaultNotes === undefined
          ? (existingTemplate.defaultNotes ?? "")
          : input.defaultNotes?.trim() || "",
      defaultLineItems: JSON.stringify(
        input.defaultLineItems ?? existingTemplate.defaultLineItems
      ),
      isActive: input.isActive ?? existingTemplate.isActive,
      isDefault: input.isDefault ?? existingTemplate.isDefault,
      logoUrl:
        input.branding === undefined
          ? (existingTemplate.logoUrl ?? "")
          : input.branding.logoUrl?.trim() || "",
      primaryColor:
        input.branding === undefined
          ? (existingTemplate.primaryColor ?? "")
          : input.branding.primaryColor?.trim() || "",
      secondaryColor:
        input.branding === undefined
          ? (existingTemplate.secondaryColor ?? "")
          : input.branding.secondaryColor?.trim() || "",
      accentColor:
        input.branding === undefined
          ? (existingTemplate.accentColor ?? "")
          : input.branding.accentColor?.trim() || "",
      fontFamily:
        input.branding === undefined
          ? (existingTemplate.fontFamily ?? "")
          : input.branding.fontFamily?.trim() || "",
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
