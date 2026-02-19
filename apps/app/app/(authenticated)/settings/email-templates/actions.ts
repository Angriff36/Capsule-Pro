"use server";

/**
 * Email Template CRUD Server Actions
 *
 * Server actions for email template management operations
 */

import { auth } from "@repo/auth/server";
import type { email_template_type, email_templates } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

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
    AND: [{ tenant_id: tenantId }, { deleted_at: null }],
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
      template_type: filters.templateType,
    });
  }

  // Add isActive filter
  if (filters.isActive !== undefined) {
    (whereClause.AND as Record<string, unknown>[]).push({
      is_active: filters.isActive,
    });
  }

  const offset = (page - 1) * limit;

  const templates = await database.email_templates.findMany({
    where: whereClause,
    orderBy: [{ created_at: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.email_templates.count({
    where: whereClause,
  });

  return {
    data: templates as email_templates[],
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

  const count = await database.email_templates.count({
    where: {
      AND: [{ tenant_id: tenantId }, { deleted_at: null }],
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

  const template = await database.email_templates.findFirst({
    where: {
      AND: [{ tenant_id: tenantId }, { id }, { deleted_at: null }],
    },
  });

  invariant(template, "Template not found");

  return template as email_templates;
}

/**
 * Get default template for a type
 */
export async function getDefaultTemplate(templateType: EmailTemplateType) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const template = await database.email_templates.findFirst({
    where: {
      AND: [
        { tenant_id: tenantId },
        { template_type: templateType },
        { is_default: true },
        { is_active: true },
        { deleted_at: null },
      ],
    },
  });

  return template as email_templates | null;
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(input: CreateEmailTemplateInput) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(input.name, "Template name is required");
  invariant(input.subject, "Template subject is required");
  invariant(input.body, "Template body is required");

  // If setting as default, unset other defaults of the same type
  if (input.isDefault) {
    await database.email_templates.updateMany({
      where: {
        tenant_id: tenantId,
        template_type: input.templateType,
        is_default: true,
        deleted_at: null,
      },
      data: { is_default: false },
    });
  }

  const template = await database.email_templates.create({
    data: {
      tenant_id: tenantId,
      name: input.name,
      template_type: input.templateType,
      subject: input.subject,
      body: input.body,
      merge_fields: input.mergeFields ?? [],
      is_active: true,
      is_default: input.isDefault ?? false,
    },
  });

  revalidatePath("/settings/email-templates");

  return template as email_templates;
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  id: string,
  input: UpdateEmailTemplateInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Template ID is required");

  // Verify template exists and belongs to tenant
  const existing = await database.email_templates.findFirst({
    where: {
      AND: [{ tenant_id: tenantId }, { id }, { deleted_at: null }],
    },
  });

  invariant(existing, "Template not found");

  // If setting as default, unset other defaults of the same type
  if (input.isDefault) {
    await database.email_templates.updateMany({
      where: {
        tenant_id: tenantId,
        template_type: input.templateType ?? existing.template_type,
        is_default: true,
        id: { not: id },
        deleted_at: null,
      },
      data: { is_default: false },
    });
  }

  const template = await database.email_templates.update({
    where: {
      tenant_id_id: { tenant_id: tenantId, id },
    },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.templateType !== undefined && {
        template_type: input.templateType,
      }),
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.mergeFields !== undefined && {
        merge_fields: input.mergeFields,
      }),
      ...(input.isActive !== undefined && { is_active: input.isActive }),
      ...(input.isDefault !== undefined && { is_default: input.isDefault }),
    },
  });

  revalidatePath("/settings/email-templates");
  revalidatePath(`/settings/email-templates/${id}`);

  return template as email_templates;
}

/**
 * Delete an email template (soft delete)
 * Per invariants: templates must never be deleted if actively used in workflows
 */
export async function deleteEmailTemplate(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Template ID is required");

  // Verify template exists and belongs to tenant
  const existing = await database.email_templates.findFirst({
    where: {
      AND: [{ tenant_id: tenantId }, { id }, { deleted_at: null }],
    },
  });

  invariant(existing, "Template not found");

  // TODO: Check for workflow usage when workflows are implemented

  // Soft delete
  await database.email_templates.update({
    where: {
      tenant_id_id: { tenant_id: tenantId, id },
    },
    data: {
      deleted_at: new Date(),
    },
  });

  revalidatePath("/settings/email-templates");

  return { success: true };
}
