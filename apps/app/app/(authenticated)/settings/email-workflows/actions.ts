"use server";

import { auth } from "@repo/auth/server";
import type { email_trigger_type } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

export type EmailTriggerType = email_trigger_type;

export const TRIGGER_TYPE_LABELS: Record<EmailTriggerType, string> = {
  event_confirmed: "Event Confirmed",
  event_canceled: "Event Canceled",
  event_completed: "Event Completed",
  task_assigned: "Task Assigned",
  task_completed: "Task Completed",
  task_reminder: "Task Reminder",
  shift_reminder: "Shift Reminder",
  proposal_sent: "Proposal Sent",
  contract_signed: "Contract Signed",
  contract_expiration: "Contract Expiration",
  custom: "Custom Trigger",
};

export const TRIGGER_TYPE_GROUPS: {
  label: string;
  types: EmailTriggerType[];
}[] = [
  {
    label: "Event Triggers",
    types: ["event_confirmed", "event_canceled", "event_completed"],
  },
  {
    label: "Task Triggers",
    types: ["task_assigned", "task_completed", "task_reminder"],
  },
  {
    label: "Staff Triggers",
    types: ["shift_reminder"],
  },
  {
    label: "Sales Triggers",
    types: ["proposal_sent", "contract_signed", "contract_expiration"],
  },
  {
    label: "Custom",
    types: ["custom"],
  },
];

export interface EmailWorkflowRow {
  id: string;
  name: string;
  triggerType: EmailTriggerType;
  triggerConfig: unknown;
  emailTemplateId: string | null;
  recipientConfig: unknown;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  templateName?: string | null;
}

export interface CreateEmailWorkflowInput {
  name: string;
  triggerType: EmailTriggerType;
  triggerConfig?: unknown;
  emailTemplateId?: string | null;
  recipientConfig?: unknown;
  isActive?: boolean;
}

export interface UpdateEmailWorkflowInput {
  name?: string;
  triggerType?: EmailTriggerType;
  triggerConfig?: unknown;
  emailTemplateId?: string | null;
  recipientConfig?: unknown;
  isActive?: boolean;
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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(input.name, "Workflow name is required");
  invariant(input.triggerType, "Trigger type is required");

  const workflow = await database.emailWorkflow.create({
    data: {
      tenantId,
      name: input.name,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig ?? {},
      emailTemplateId: input.emailTemplateId ?? null,
      emailTemplateTenantId: input.emailTemplateId ? tenantId : null,
      recipientConfig: input.recipientConfig ?? { type: "client" },
      isActive: input.isActive ?? true,
    },
  });

  revalidatePath("/settings/email-workflows");
  return workflow;
}

export async function updateEmailWorkflow(
  id: string,
  input: UpdateEmailWorkflowInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Workflow ID is required");

  const existing = await database.emailWorkflow.findFirst({
    where: { tenantId, id, deletedAt: null },
  });
  invariant(existing, "Workflow not found");

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.triggerType !== undefined) data.triggerType = input.triggerType;
  if (input.triggerConfig !== undefined)
    data.triggerConfig = input.triggerConfig;
  if (input.emailTemplateId !== undefined) {
    data.emailTemplateId = input.emailTemplateId;
    data.emailTemplateTenantId = input.emailTemplateId ? tenantId : null;
  }
  if (input.recipientConfig !== undefined)
    data.recipientConfig = input.recipientConfig;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const workflow = await database.emailWorkflow.update({
    where: { tenantId_id: { tenantId, id } },
    data: data as Parameters<typeof database.emailWorkflow.update>[0]["data"],
  });

  revalidatePath("/settings/email-workflows");
  revalidatePath(`/settings/email-workflows/${id}`);
  return workflow;
}

export async function toggleEmailWorkflow(id: string, isActive: boolean) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const existing = await database.emailWorkflow.findFirst({
    where: { tenantId, id, deletedAt: null },
  });
  invariant(existing, "Workflow not found");

  await database.emailWorkflow.update({
    where: { tenantId_id: { tenantId, id } },
    data: { isActive },
  });

  revalidatePath("/settings/email-workflows");
  return { success: true };
}

export async function deleteEmailWorkflow(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const existing = await database.emailWorkflow.findFirst({
    where: { tenantId, id, deletedAt: null },
  });
  invariant(existing, "Workflow not found");

  await database.emailWorkflow.update({
    where: { tenantId_id: { tenantId, id } },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/settings/email-workflows");
  return { success: true };
}
