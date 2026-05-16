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

  const template = await database.emailTemplate.create({
    data: {
      tenantId,
      name: input.name,
      templateType: input.templateType,
      subject: input.subject,
      body: input.body,
      mergeFields: input.mergeFields ?? [],
      isActive: true,
      isDefault: input.isDefault ?? false,
    },
  });

  revalidatePath("/settings/email-templates");

  return template as EmailTemplate;
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
  const existing = await database.emailTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Template not found");

  // If setting as default, unset other defaults of the same type
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

  const template = await database.emailTemplate.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.templateType !== undefined && {
        templateType: input.templateType,
      }),
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.mergeFields !== undefined && {
        mergeFields: input.mergeFields,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
    },
  });

  revalidatePath("/settings/email-templates");
  revalidatePath(`/settings/email-templates/${id}`);

  return template as EmailTemplate;
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
  const existing = await database.emailTemplate.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Template not found");

  // Check if any active email workflow references this template
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

  // Soft delete
  await database.emailTemplate.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/settings/email-templates");

  return { success: true };
}
