"use server";

/**
 * Email Template CRUD Server Actions
 *
 * Server actions for email template management operations
 */

import { auth } from "@repo/auth/server";
import type { EmailTemplate, email_template_type } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

// Types
export type EmailTemplateType = email_template_type;

export interface EmailTemplateFilters {
  search?: string;
  templateType?: EmailTemplateType;
  isActive?: boolean;
}

export interface CreateEmailTemplateInput {
  name: string;
  templateType: EmailTemplateType;
  subject: string;
  body: string;
  mergeFields?: string[];
  isDefault?: boolean;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  templateType?: EmailTemplateType;
  subject?: string;
  body?: string;
  mergeFields?: string[];
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Get list of email templates with filters and pagination
 */
export async function getEmailTemplates(
  filters: EmailTemplateFilters = {},
  page = 1,
  limit = 50
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
        { subject: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }

  // Add templateType filter
  if (filters.templateType) {
    (whereClause.AND as Record<string, unknown>[]).push({
      templateType: filters.templateType,
    });
  }

  // Add isActive filter
  if (filters.isActive !== undefined) {
    (whereClause.AND as Record<string, unknown>[]).push({
      isActive: filters.isActive,
    });
  }

  const offset = (page - 1) * limit;

  const templates = await database.emailTemplate.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.emailTemplate.count({
    where: whereClause,
  });

  return {
    data: templates as EmailTemplate[],
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get template count (for stats)
 */
export async function getEmailTemplateCount() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const count = await database.emailTemplate.count({
    where: {
      AND: [{ tenantId }, { deletedAt: null }],
    },
  });

  return count;
}

/**
 * Get email template by ID
 */
export async function getEmailTemplateById(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Template ID is required");

  const template = await database.emailTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(template, "Template not found");

  return template as EmailTemplate;
}

/**
 * Get default template for a type
 */
export async function getDefaultTemplate(templateType: EmailTemplateType) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const template = await database.emailTemplate.findFirst({
    where: {
      AND: [
        { tenantId },
        { templateType },
        { isDefault: true },
        { isActive: true },
        { deletedAt: null },
      ],
    },
  });

  return template as EmailTemplate | null;
}

/**
 * Create a new email template
 *
 * Governed write: EmailTemplate.create runs through the Manifest runtime
 * (constitution §9) — no direct database.emailTemplate.create.
 * requireCurrentUser supplies the actor + tenant the command needs for
 * policy + audit context (§19 Clerk→Manifest context).
 *
 * The updateMany to unset other defaults of the same type is a batch
 * side-effect on OTHER records — it stays as direct Prisma (no single-record
 * Manifest command for batch updates). The primary write is governed.
 */
export async function createEmailTemplate(input: CreateEmailTemplateInput) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(input.name, "Template name is required");
  invariant(input.subject, "Template subject is required");
  invariant(input.body, "Template body is required");

  // If setting as default, unset other defaults of the same type (batch
  // side-effect on other records — no Manifest command for updateMany).
  if (input.isDefault) {
    await database.emailTemplate.updateMany({
      where: {
        tenantId,
        templateType: input.templateType,
        isDefault: true,
        deletedAt: null,
      },
      data: { isDefault: false },
    });
  }

  const result = await runManifestCommand({
    entity: "EmailTemplate",
    command: "create",
    body: {
      name: input.name,
      templateType: input.templateType,
      subject: input.subject,
      body: input.body,
      // Manifest declares mergeFields: string, but the Prisma column is Json.
      // GenericPrismaStore's asJsonInput passes the value through verbatim,
      // so we pass the array directly (same as prior direct-write behavior).
      mergeFields: (input.mergeFields ?? []) as unknown as string,
      isActive: true,
      isDefault: input.isDefault ?? false,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create email template");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "EmailTemplate.create did not return an id");

  // Read back the persisted row to preserve the EmailTemplate return shape
  // (constitution §10 — reads may bypass runtime).
  const template = await database.emailTemplate.findFirst({
    where: { tenantId, id: createdId },
  });
  invariant(template, "Created email template could not be loaded");

  revalidatePath("/settings/email-templates");

  return template as EmailTemplate;
}

/**
 * Update an email template
 *
 * Governed write: EmailTemplate.update runs through the Manifest runtime
 * (constitution §9). The update command mutates ALL fields, so partial input
 * is merged with existing values to preserve partial-update semantics.
 * The updateMany to unset other defaults is a batch side-effect (stays direct).
 */
export async function updateEmailTemplate(
  id: string,
  input: UpdateEmailTemplateInput
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(id, "Template ID is required");

  // Verify template exists and belongs to tenant (read — constitution §10)
  const existing = await database.emailTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Template not found");

  // If setting as default, unset other defaults of the same type (batch
  // side-effect on other records — no Manifest command for updateMany).
  if (input.isDefault) {
    await database.emailTemplate.updateMany({
      where: {
        tenantId,
        templateType: input.templateType ?? existing.templateType,
        isDefault: true,
        id: { not: id },
        deletedAt: null,
      },
      data: { isDefault: false },
    });
  }

  // Merge partial input over current values: the governed EmailTemplate.update
  // mutates the FULL field set, so any field the caller omits must carry its
  // existing value (same pattern as Venue.update migration).
  const result = await runManifestCommand({
    entity: "EmailTemplate",
    command: "update",
    body: {
      id,
      name: input.name ?? existing.name,
      templateType: input.templateType ?? existing.templateType,
      subject: input.subject ?? existing.subject,
      body: input.body ?? existing.body,
      // Manifest declares mergeFields: string, Prisma column is Json.
      // Pass array directly — GenericPrismaStore handles coercion.
      mergeFields: (input.mergeFields ?? (existing.mergeFields as string[] | null) ?? []) as unknown as string,
      isActive: input.isActive ?? existing.isActive,
      isDefault: input.isDefault ?? existing.isDefault,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update email template");
  }

  // Read back the persisted row to preserve the EmailTemplate return shape.
  const template = await database.emailTemplate.findFirst({
    where: { tenantId, id },
  });
  invariant(template, "Updated email template could not be loaded");

  revalidatePath("/settings/email-templates");
  revalidatePath(`/settings/email-templates/${id}`);

  return template as EmailTemplate;
}

/**
 * Delete an email template (soft delete)
 *
 * Per invariants: templates must never be deleted if actively used in workflows.
 * Governed write: EmailTemplate.softDelete runs through the Manifest runtime
 * (constitution §9) — sets deletedAt + emits EmailTemplateDeleted, no direct
 * database.emailTemplate.update. The active-workflow guard is a cross-entity
 * READ kept in the action (a Manifest guard can't query another table).
 */
export async function deleteEmailTemplate(id: string) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(id, "Template ID is required");

  // Verify template exists and belongs to tenant (read — constitution §10)
  const existing = await database.emailTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Template not found");

  // Domain read-guard: block soft-delete when the template is actively used
  // by email workflows. Cross-entity READ stays in the action (constitution
  // §10 — reads may bypass runtime).
  const activeWorkflow = await database.emailWorkflow.findFirst({
    where: {
      tenantId,
      emailTemplateId: id,
      isActive: true,
      deletedAt: null,
    },
  });

  invariant(
    !activeWorkflow,
    "Cannot delete template: it is actively used by one or more email workflows"
  );

  // Governed soft delete via the Manifest runtime — sets deletedAt + emits
  // EmailTemplateDeleted, no direct database write.
  const result = await runManifestCommand({
    entity: "EmailTemplate",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete email template");
  }

  revalidatePath("/settings/email-templates");

  return { success: true };
}
