/**
 * Email Workflow Trigger Service
 *
 * Handles triggering automated emails based on workflow configurations.
 * This service is called by event handlers (event status changes, task assignments, etc.)
 */

import type { PrismaClient } from "@repo/database";
import {
  type EmailRecipient,
  sendEmailFromTemplate,
} from "./email-notification-service";

export interface WorkflowTriggerContext {
  tenantId: string;
  triggerType:
    | "event_confirmed"
    | "event_canceled"
    | "event_completed"
    | "task_assigned"
    | "task_completed"
    | "task_reminder"
    | "shift_reminder"
    | "proposal_sent"
    | "contract_signed"
    | "custom";
  entity: {
    id: string;
    type: "event" | "task" | "shift" | "proposal" | "contract";
  };
  templateData: Record<string, string | number | undefined>;
  recipients: EmailRecipient[];
}

/**
 * Triggers email workflows for a given trigger type and context
 */
export async function triggerEmailWorkflows(
  database: PrismaClient,
  context: WorkflowTriggerContext
): Promise<{
  triggered: number;
  results: Array<{ workflowId: string; success: boolean; error?: string }>;
}> {
  const {
    tenantId,
    triggerType,
    entity: _entity,
    templateData,
    recipients,
  } = context;

  // Find all active workflows for this trigger type
  const workflows = await database.emailWorkflow.findMany({
    where: {
      tenantId,
      triggerType,
      isActive: true,
      deletedAt: null,
    },
    include: {
      emailTemplate: true,
    },
  });

  if (workflows.length === 0) {
    return { triggered: 0, results: [] };
  }

  const results: Array<{
    workflowId: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const workflow of workflows) {
    try {
      // Apply recipient filtering from workflow config
      const filteredRecipients = filterRecipients(
        recipients,
        workflow.recipientConfig as RecipientConfig
      );

      if (filteredRecipients.length === 0) {
        continue;
      }

      // Send email
      if (workflow.emailTemplate) {
        await sendEmailFromTemplate(database, {
          tenantId,
          templateId: workflow.emailTemplate.id,
          notificationType: triggerType,
          recipients: filteredRecipients,
          templateData,
          workflowId: workflow.id,
        });
      } else {
        // If no template, skip (workflow should have a template)
        console.warn(
          `Workflow ${workflow.id} has no email template configured`
        );
        continue;
      }

      // Update last triggered timestamp
      await database.emailWorkflow.update({
        where: {
          tenantId_id: {
            tenantId,
            id: workflow.id,
          },
        },
        data: {
          lastTriggeredAt: new Date(),
        },
      });

      results.push({
        workflowId: workflow.id,
        success: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to trigger workflow ${workflow.id}:`, error);
      results.push({
        workflowId: workflow.id,
        success: false,
        error: errorMessage,
      });
    }
  }

  return {
    triggered: results.filter((r) => r.success).length,
    results,
  };
}

interface RecipientConfig {
  includeRoles?: string[];
  excludeRoles?: string[];
  includeEmployeeIds?: string[];
  excludeEmployeeIds?: string[];
  notifyClient?: boolean;
  notifyAssignedUser?: boolean;
  notifyManager?: boolean;
}

/**
 * Filters recipients based on workflow recipient configuration
 */
function filterRecipients(
  recipients: EmailRecipient[],
  config: RecipientConfig
): EmailRecipient[] {
  if (!config || Object.keys(config).length === 0) {
    return recipients;
  }

  return recipients.filter((recipient) => {
    // Check exclude lists first
    if (
      config.excludeEmployeeIds &&
      recipient.employeeId &&
      config.excludeEmployeeIds.includes(recipient.employeeId)
    ) {
      return false;
    }

    // Check include lists (if specified, only include matching)
    if (
      config.includeEmployeeIds &&
      recipient.employeeId &&
      !config.includeEmployeeIds.includes(recipient.employeeId)
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Helper to build email recipients from event data
 */
export function buildEventRecipients(event: {
  client_email?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
}): EmailRecipient[] {
  const recipients: EmailRecipient[] = [];

  if (event.client_email) {
    recipients.push({
      email: event.client_email,
      name: [event.client_first_name, event.client_last_name]
        .filter(Boolean)
        .join(" "),
    });
  }

  return recipients;
}

/**
 * Helper to build email recipients from task assignment data
 */
export function buildTaskRecipients(task: {
  assigned_employee_id?: string | null;
  employee?: {
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}): EmailRecipient[] {
  const recipients: EmailRecipient[] = [];

  if (task.employee?.email) {
    recipients.push({
      email: task.employee.email,
      employeeId: task.assigned_employee_id ?? undefined,
      name: [task.employee.first_name, task.employee.last_name]
        .filter(Boolean)
        .join(" "),
    });
  }

  return recipients;
}

/**
 * Helper to build template data from event
 */
export function buildEventTemplateData(event: {
  name?: string | null;
  event_date?: Date | null;
  start_time?: Date | null;
  venue?: { name: string } | null;
  status?: string;
}): Record<string, string | number | undefined> {
  return {
    eventName: event.name ?? "Your Event",
    eventDate: event.event_date ? formatDate(event.event_date) : undefined,
    eventTime: event.start_time ? formatTime(event.start_time) : undefined,
    eventLocation: event.venue?.name ?? undefined,
    eventStatus: event.status ?? undefined,
    dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/events`
      : undefined,
  };
}

/**
 * Helper to build template data from task
 */
export function buildTaskTemplateData(task: {
  name?: string | null;
  description?: string | null;
  due_date?: Date | null;
  priority?: string | null;
}): Record<string, string | number | undefined> {
  return {
    taskName: task.name ?? "Task",
    taskDescription: task.description ?? undefined,
    taskDueDate: task.due_date ? formatDate(task.due_date) : undefined,
    taskPriority: task.priority ?? undefined,
    dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/tasks`
      : undefined,
  };
}

/**
 * Format a date for email templates
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a time for email templates
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
