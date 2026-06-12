"use server";

import { auth } from "@repo/auth/server";
import type { email_trigger_type } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

export type EmailTriggerType = email_trigger_type;

export interface EmailWorkflowRow {
  createdAt: Date;
  emailTemplateId: string | null;
  id: string;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  name: string;
  recipientConfig: unknown;
  templateName?: string | null;
  triggerConfig: unknown;
  triggerType: EmailTriggerType;
  updatedAt: Date;
}

export interface CreateEmailWorkflowInput {
  emailTemplateId?: string | null;
  isActive?: boolean;
  name: string;
  recipientConfig?: unknown;
  triggerConfig?: unknown;
  triggerType: EmailTriggerType;
}

export interface UpdateEmailWorkflowInput {
  emailTemplateId?: string | null;
  isActive?: boolean;
  name?: string;
  recipientConfig?: unknown;
  triggerConfig?: unknown;
  triggerType?: EmailTriggerType;
}

export async function getEmailWorkflows(
  filters: {
    search?: string;
    triggerType?: EmailTriggerType;
    isActive?: boolean;
  } = {}
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { deletedAt: null }],
  };

  if (filters.search) {
    (whereClause.AND as Record<string, unknown>[]).push({
      name: { contains: filters.search, mode: "insensitive" },
    });
  }

  if (filters.triggerType) {
    (whereClause.AND as Record<string, unknown>[]).push({
      triggerType: filters.triggerType,
    });
  }

  if (filters.isActive !== undefined) {
    (whereClause.AND as Record<string, unknown>[]).push({
      isActive: filters.isActive,
    });
  }

  const workflows = await database.emailWorkflow.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    include: {
      emailTemplate: { select: { name: true } },
    },
  });

  return workflows.map((w) => ({
    id: w.id,
    name: w.name,
    triggerType: w.triggerType,
    triggerConfig: w.triggerConfig,
    emailTemplateId: w.emailTemplateId,
    recipientConfig: w.recipientConfig,
    isActive: w.isActive,
    lastTriggeredAt: w.lastTriggeredAt,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    templateName: w.emailTemplate?.name ?? null,
  })) as EmailWorkflowRow[];
}

export async function getEmailWorkflowById(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Workflow ID is required");

  const workflow = await database.emailWorkflow.findFirst({
    where: { tenantId, id, deletedAt: null },
    include: {
      emailTemplate: { select: { name: true } },
    },
  });

  invariant(workflow, "Workflow not found");

  return {
    ...workflow,
    templateName: workflow.emailTemplate?.name ?? null,
  };
}

export async function getAvailableTemplates() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  return database.emailTemplate.findMany({
    where: { tenantId, deletedAt: null, isActive: true },
    select: { id: true, name: true, templateType: true, subject: true },
    orderBy: { name: "asc" },
  });
}

export async function createEmailWorkflow(input: CreateEmailWorkflowInput) {
  // Governed write: EmailWorkflow.create runs through the Manifest runtime
  // (constitution §9) — no direct database.emailWorkflow.create. requireCurrentUser
  // supplies the actor + tenant the EmailWorkflowDefaultAccess policy (manager/admin)
  // and audit context (§19) require.
  const user = await requireCurrentUser();
  invariant(input.name, "Workflow name is required");
  invariant(input.triggerType, "Trigger type is required");

  const emailTemplateId = input.emailTemplateId ?? "";
  const result = await runManifestCommand({
    entity: "EmailWorkflow",
    command: "create",
    body: {
      name: input.name,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig ?? {},
      emailTemplateId,
      // Composite tenant key for the emailTemplate relation; the store coerces
      // "" → null on the nullable @db.Uuid column, so only set it (to the actor's
      // tenant) when a template is actually selected.
      emailTemplateTenantId: emailTemplateId ? user.tenantId : "",
      recipientConfig: input.recipientConfig ?? { type: "client" },
      isActive: input.isActive ?? true,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create email workflow");
  }
  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "EmailWorkflow.create did not return an id");

  revalidatePath("/settings/email-workflows");

  // Read back the persisted row to preserve the prior (non-null) return shape.
  const workflow = await database.emailWorkflow.findFirst({
    where: { tenantId: user.tenantId, id: createdId },
  });
  invariant(workflow, "EmailWorkflow not found after create");
  return workflow;
}

export async function updateEmailWorkflow(
  id: string,
  input: UpdateEmailWorkflowInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const user = await requireCurrentUser();
  invariant(id, "Workflow ID is required");

  const existing = await database.emailWorkflow.findFirst({
    where: { tenantId: user.tenantId, id, deletedAt: null },
  });
  invariant(existing, "Workflow not found");

  // EmailWorkflow.update is a full-field command (constitution §9). The settings
  // UI historically did partial updates, so merge the partial input over the
  // current row before invoking, preserving any field the caller didn't supply.
  const emailTemplateId =
    input.emailTemplateId === undefined
      ? (existing.emailTemplateId ?? "")
      : (input.emailTemplateId ?? "");

  const result = await runManifestCommand({
    entity: "EmailWorkflow",
    command: "update",
    body: {
      id,
      name: input.name ?? existing.name,
      triggerType: input.triggerType ?? existing.triggerType,
      triggerConfig: input.triggerConfig ?? existing.triggerConfig ?? {},
      emailTemplateId,
      emailTemplateTenantId: emailTemplateId ? user.tenantId : "",
      recipientConfig: input.recipientConfig ?? existing.recipientConfig ?? {},
      isActive: input.isActive ?? existing.isActive,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update email workflow");
  }

  revalidatePath("/settings/email-workflows");
  revalidatePath(`/settings/email-workflows/${id}`);

  const workflow = await database.emailWorkflow.findFirst({
    where: { tenantId: user.tenantId, id },
  });
  invariant(workflow, "EmailWorkflow not found after update");
  return workflow;
}

export async function toggleEmailWorkflow(id: string, isActive: boolean) {
  // Governed partial toggle via EmailWorkflow.setActive (constitution §9). The
  // command fails closed if the workflow doesn't exist, so the prior explicit
  // not-found lookup is no longer needed.
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "EmailWorkflow",
    command: "setActive",
    body: { id, isActive },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to toggle email workflow");
  }

  revalidatePath("/settings/email-workflows");
  return { success: true };
}

export async function deleteEmailWorkflow(id: string) {
  // Governed soft delete via EmailWorkflow.softDelete (constitution §9) — sets
  // deletedAt + isActive=false and emits EmailWorkflowDeleted, no direct
  // database.emailWorkflow.update.
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "EmailWorkflow",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete email workflow");
  }

  revalidatePath("/settings/email-workflows");
  return { success: true };
}
