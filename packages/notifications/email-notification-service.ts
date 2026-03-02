/**
 * Email Notification Service
 *
 * Handles sending automated email notifications with:
 * - Opt-in/opt-out checking via notification_preferences
 * - Template rendering with merge fields from email_templates
 * - Delivery status tracking via email_logs
 * - Multiple recipient support
 */

import type { PrismaClient } from "@repo/database";
import { renderEmailTemplate, validateTemplateData } from "./email-templates";
import { keys } from "./keys";

export type EmailStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "opened"
  | "failed"
  | "bounced";

export interface EmailRecipient {
  email: string;
  employeeId?: string;
  clientId?: string;
  name?: string;
}

export interface SendEmailOptions {
  tenantId: string;
  notificationType: string;
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  workflowId?: string;
  templateData?: Record<string, string | number | undefined>;
}

export interface SendEmailResult {
  success: boolean;
  logId?: string;
  error?: string;
  status: EmailStatus;
}

export interface EmailLogEntry {
  id: string;
  tenantId: string;
  workflowId?: string;
  recipientEmail: string;
  recipientId?: string;
  recipientType?: string;
  subject: string;
  notificationType: string;
  status: EmailStatus;
  resendId?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  failedAt?: Date;
  createdAt: Date;
}

// Email validation regex - top level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address format
 */
function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Checks if a recipient has opted in to email notifications for a specific type
 */
async function checkOptInStatus(
  database: PrismaClient,
  tenantId: string,
  employeeId: string | undefined,
  notificationType: string
): Promise<boolean> {
  // Only check opt-in for employees (clients don't have notification preferences)
  if (!employeeId) {
    return true;
  }

  const preference = await database.notification_preferences.findFirst({
    where: {
      tenant_id: tenantId,
      employee_id: employeeId,
      notification_type: notificationType,
      channel: "email",
    },
  });

  // If no preference exists, default to opted-in
  // If preference exists, respect the is_enabled value
  return preference?.is_enabled ?? true;
}

/**
 * Creates a log entry for an email message
 */
async function createEmailLog(
  database: PrismaClient,
  tenantId: string,
  recipient: EmailRecipient,
  subject: string,
  notificationType: string,
  workflowId: string | undefined,
  status: EmailStatus = "pending"
): Promise<string> {
  // Determine recipient type
  let recipientType: string | undefined;
  if (recipient.employeeId) {
    recipientType = "employee";
  } else if (recipient.clientId) {
    recipientType = "client";
  }

  const log = await database.emailLog.create({
    data: {
      tenantId,
      workflowId,
      recipientEmail: recipient.email,
      recipientId: recipient.employeeId ?? recipient.clientId,
      recipientType,
      subject,
      notificationType,
      status,
    },
  });

  return log.id;
}

/**
 * Updates an email log entry with delivery status
 */
async function updateEmailLog(
  database: PrismaClient,
  tenantId: string,
  logId: string,
  updates: {
    status: EmailStatus;
    resendId?: string;
    errorMessage?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    failedAt?: Date;
  }
): Promise<void> {
  await database.emailLog.update({
    where: {
      tenantId_id: {
        tenantId,
        id: logId,
      },
    },
    data: updates,
  });
}

/**
 * Gets the Resend client
 */
async function getResendClient() {
  const env = keys();
  const resendToken = env.RESEND_TOKEN;

  if (!resendToken) {
    throw new Error("Resend API token not configured");
  }

  const { Resend } = await import("resend");
  return new Resend(resendToken);
}

/**
 * Sends a single email via Resend
 */
async function sendSingleEmail(
  to: string,
  subject: string,
  htmlBody: string,
  recipientName?: string
): Promise<{ id: string }> {
  const client = await getResendClient();

  const result = await client.emails.send({
    from: "Convoy <noreply@convoy.app>",
    to: recipientName ? `${recipientName} <${to}>` : to,
    subject,
    html: htmlBody,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    id: result.data?.id ?? "",
  };
}

/**
 * Main function to send email notifications
 */
export async function sendEmailNotification(
  database: PrismaClient,
  options: SendEmailOptions
): Promise<SendEmailResult[]> {
  const {
    tenantId,
    notificationType,
    recipients,
    subject,
    body,
    workflowId,
    templateData,
  } = options;

  // Render the body with template data if provided
  const renderedBody = templateData
    ? renderEmailTemplate(body, templateData)
    : body;
  const renderedSubject = templateData
    ? renderEmailTemplate(subject, templateData)
    : subject;

  const results: SendEmailResult[] = [];

  for (const recipient of recipients) {
    try {
      // Validate email format
      if (!validateEmail(recipient.email)) {
        results.push({
          success: false,
          error: `Invalid email address: ${recipient.email}`,
          status: "failed",
        });
        continue;
      }

      // Check opt-in status for employees
      const optedIn = await checkOptInStatus(
        database,
        tenantId,
        recipient.employeeId,
        notificationType
      );

      if (!optedIn) {
        results.push({
          success: false,
          error: "Recipient has opted out of email notifications",
          status: "failed",
        });
        continue;
      }

      // Create pending log entry
      const logId = await createEmailLog(
        database,
        tenantId,
        recipient,
        renderedSubject,
        notificationType,
        workflowId,
        "pending"
      );

      // Send the email
      const resendResult = await sendSingleEmail(
        recipient.email,
        renderedSubject,
        renderedBody,
        recipient.name
      );

      // Update log to sent
      await updateEmailLog(database, tenantId, logId, {
        status: "sent",
        resendId: resendResult.id,
        sentAt: new Date(),
      });

      results.push({
        success: true,
        logId,
        status: "sent",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Log the failure
      const logId = await createEmailLog(
        database,
        tenantId,
        recipient,
        renderedSubject,
        notificationType,
        workflowId,
        "failed"
      );

      await updateEmailLog(database, tenantId, logId, {
        status: "failed",
        errorMessage,
        failedAt: new Date(),
      });

      results.push({
        success: false,
        error: errorMessage,
        status: "failed",
      });
    }
  }

  return results;
}

/**
 * Sends email using a stored email template
 */
export async function sendEmailFromTemplate(
  database: PrismaClient,
  options: {
    tenantId: string;
    templateId: string;
    notificationType: string;
    recipients: EmailRecipient[];
    templateData: Record<string, string | number | undefined>;
    workflowId?: string;
  }
): Promise<SendEmailResult[]> {
  const {
    tenantId,
    templateId,
    notificationType,
    recipients,
    templateData,
    workflowId,
  } = options;

  // Fetch the template
  const template = await database.email_templates.findFirst({
    where: {
      tenant_id: tenantId,
      id: templateId,
      is_active: true,
      deleted_at: null,
    },
  });

  if (!template) {
    throw new Error(`Email template not found: ${templateId}`);
  }

  // Validate template data
  const validation = validateTemplateData(template.body, templateData);
  if (!validation.valid) {
    console.warn(
      `Missing template fields: ${validation.missingFields.join(", ")}`
    );
  }

  return sendEmailNotification(database, {
    tenantId,
    notificationType,
    recipients,
    subject: template.subject,
    body: template.body,
    workflowId,
    templateData,
  });
}

/**
 * Updates email delivery status from Resend webhook callback
 */
export async function updateEmailDeliveryStatus(
  database: PrismaClient,
  tenantId: string,
  resendId: string,
  newStatus: EmailStatus,
  errorMessage?: string
): Promise<void> {
  const log = await database.emailLog.findFirst({
    where: {
      tenantId,
      resendId,
    },
  });

  if (!log) {
    console.error(`Email log not found for Resend ID: ${resendId}`);
    return;
  }

  const updates: {
    status: EmailStatus;
    deliveredAt?: Date;
    openedAt?: Date;
    failedAt?: Date;
    bouncedAt?: Date;
    errorMessage?: string;
  } = {
    status: newStatus,
  };

  switch (newStatus) {
    case "delivered":
      updates.deliveredAt = new Date();
      break;
    case "opened":
      updates.openedAt = new Date();
      break;
    case "failed":
      updates.failedAt = new Date();
      break;
    case "bounced":
      updates.failedAt = new Date();
      break;
    default:
      // No additional timestamp for other statuses
      break;
  }

  if (errorMessage) {
    updates.errorMessage = errorMessage;
  }

  await updateEmailLog(database, tenantId, log.id, updates);
}

/**
 * Gets email logs for a tenant with optional filtering
 */
export async function getEmailLogs(
  database: PrismaClient,
  tenantId: string,
  options?: {
    workflowId?: string;
    recipientEmail?: string;
    notificationType?: string;
    status?: EmailStatus;
    limit?: number;
    offset?: number;
  }
): Promise<EmailLogEntry[]> {
  const logs = await database.emailLog.findMany({
    where: {
      tenantId,
      ...(options?.workflowId && { workflowId: options.workflowId }),
      ...(options?.recipientEmail && {
        recipientEmail: options.recipientEmail,
      }),
      ...(options?.notificationType && {
        notificationType: options.notificationType,
      }),
      ...(options?.status && { status: options.status }),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });

  return logs.map((log) => ({
    id: log.id,
    tenantId: log.tenantId,
    workflowId: log.workflowId ?? undefined,
    recipientEmail: log.recipientEmail,
    recipientId: log.recipientId ?? undefined,
    recipientType: log.recipientType ?? undefined,
    subject: log.subject,
    notificationType: log.notificationType,
    status: log.status as EmailStatus,
    resendId: log.resendId ?? undefined,
    errorMessage: log.errorMessage ?? undefined,
    sentAt: log.sentAt ?? undefined,
    deliveredAt: log.deliveredAt ?? undefined,
    openedAt: log.openedAt ?? undefined,
    failedAt: log.failedAt ?? undefined,
    createdAt: log.createdAt,
  }));
}

/**
 * Sets email notification preference for an employee
 */
export async function setEmailPreference(
  database: PrismaClient,
  tenantId: string,
  employeeId: string,
  notificationType: string,
  isEnabled: boolean
): Promise<void> {
  await database.notification_preferences.upsert({
    where: {
      tenant_id_employee_id_notification_type_channel: {
        tenant_id: tenantId,
        employee_id: employeeId,
        notification_type: notificationType,
        channel: "email",
      },
    },
    create: {
      tenant_id: tenantId,
      employee_id: employeeId,
      notification_type: notificationType,
      channel: "email",
      is_enabled: isEnabled,
    },
    update: {
      is_enabled: isEnabled,
      updated_at: new Date(),
    },
  });
}

/**
 * Gets email notification preferences for an employee
 */
export async function getEmailPreferences(
  database: PrismaClient,
  tenantId: string,
  employeeId: string
): Promise<
  Array<{ notificationType: string; isEnabled: boolean; channel: string }>
> {
  const preferences = await database.notification_preferences.findMany({
    where: {
      tenant_id: tenantId,
      employee_id: employeeId,
      channel: "email",
    },
  });

  return preferences.map((pref) => ({
    notificationType: pref.notification_type,
    isEnabled: pref.is_enabled,
    channel: pref.channel,
  }));
}
