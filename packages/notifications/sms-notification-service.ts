/**
 * SMS Notification Service
 *
 * Handles sending SMS notifications with:
 * - Opt-in/opt-out checking via notification_preferences
 * - Template rendering with merge fields
 * - Delivery status tracking via sms_logs
 * - Multiple recipient support
 */

import type { PrismaClient } from "@repo/database";
import { keys } from "./keys";
import {
  renderSmsTemplate,
  renderSmsTemplateByType,
  type SmsTemplateData,
  SMS_TEMPLATES,
} from "./sms-templates";

// E.164 phone validation: must start with + and contain 1-15 digits
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export type SmsStatus = "pending" | "sent" | "delivered" | "failed";

export interface SendSmsOptions {
  tenantId: string;
  notificationType: string;
  recipients: SmsRecipient[];
  templateData: SmsTemplateData;
  customMessage?: string;
}

export interface SmsRecipient {
  employeeId?: string;
  phoneNumber: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status: SmsStatus;
}

export interface SmsLogEntry {
  id: string;
  tenantId: string;
  employeeId?: string;
  phoneNumber: string;
  message: string;
  notificationType: string;
  status: SmsStatus;
  twilioSid?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  createdAt: Date;
}

/**
 * Normalizes and validates a phone number to E.164 format
 */
function normalizePhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();

  // If already in E.164 format, return as-is
  if (E164_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Try to convert US number to E.164
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  throw new Error(
    `Invalid phone number: ${phoneNumber}. Must be in E.164 format (e.g., +1234567890)`
  );
}

/**
 * Checks if an employee has opted in to SMS notifications for a specific type
 */
async function checkOptInStatus(
  database: PrismaClient,
  tenantId: string,
  employeeId: string,
  notificationType: string
): Promise<boolean> {
  const preference = await database.notification_preferences.findFirst({
    where: {
      tenant_id: tenantId,
      employee_id: employeeId,
      notification_type: notificationType,
      channel: "sms",
    },
  });

  // If no preference exists, default to opted-in
  // If preference exists, respect the is_enabled value
  return preference?.is_enabled ?? true;
}

/**
 * Creates a log entry for an SMS message
 */
async function createSmsLog(
  database: PrismaClient,
  tenantId: string,
  employeeId: string | undefined,
  phoneNumber: string,
  message: string,
  notificationType: string,
  status: SmsStatus = "pending"
): Promise<string> {
  const log = await database.sms_logs.create({
    data: {
      tenant_id: tenantId,
      employee_id: employeeId,
      phone_number: phoneNumber,
      message,
      notification_type: notificationType,
      status,
    },
  });

  return log.id;
}

/**
 * Updates an SMS log entry with delivery status
 */
async function updateSmsLog(
  database: PrismaClient,
  tenantId: string,
  logId: string,
  updates: {
    status: SmsStatus;
    twilioSid?: string;
    errorMessage?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    failedAt?: Date;
  }
): Promise<void> {
  await database.sms_logs.update({
    where: {
      tenant_id_id: {
        tenant_id: tenantId,
        id: logId,
      },
    },
    data: updates,
  });
}

/**
 * Gets the Twilio client
 */
async function getTwilioClient() {
  const env = keys();
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;

  if (!(accountSid && authToken)) {
    throw new Error("Twilio credentials not configured");
  }

  const twilio = await import("twilio");
  return twilio.default(accountSid, authToken);
}

/**
 * Sends a single SMS message via Twilio
 */
async function sendSingleSms(
  to: string,
  message: string
): Promise<{ sid: string; status: string }> {
  const env = keys();
  const fromNumber = env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    throw new Error("Twilio phone number not configured");
  }

  const client = await getTwilioClient();
  const normalizedPhone = normalizePhoneNumber(to);

  const result = await client.messages.create({
    body: message,
    from: fromNumber,
    to: normalizedPhone,
  });

  return {
    sid: result.sid,
    status: result.status,
  };
}

/**
 * Main function to send SMS notifications
 */
export async function sendSmsNotification(
  database: PrismaClient,
  options: SendSmsOptions
): Promise<SendSmsResult[]> {
  const { tenantId, notificationType, recipients, templateData, customMessage } =
    options;

  // Determine the message content
  let message: string;
  if (customMessage) {
    message = renderSmsTemplate(customMessage, templateData);
  } else if (SMS_TEMPLATES[notificationType]) {
    message = renderSmsTemplateByType(notificationType, templateData);
  } else {
    throw new Error(
      `No template found for notification type: ${notificationType}`
    );
  }

  const results: SendSmsResult[] = [];

  for (const recipient of recipients) {
    try {
      // Check opt-in status if employee ID is provided
      if (recipient.employeeId) {
        const optedIn = await checkOptInStatus(
          database,
          tenantId,
          recipient.employeeId,
          notificationType
        );

        if (!optedIn) {
          results.push({
            success: false,
            error: "Recipient has opted out of SMS notifications",
            status: "failed",
          });
          continue;
        }
      }

      // Create pending log entry
      const logId = await createSmsLog(
        database,
        tenantId,
        recipient.employeeId,
        recipient.phoneNumber,
        message,
        notificationType,
        "pending"
      );

      // Send the SMS
      const twilioResult = await sendSingleSms(recipient.phoneNumber, message);

      // Update log to sent
      await updateSmsLog(database, tenantId, logId, {
        status: "sent",
        twilioSid: twilioResult.sid,
        sentAt: new Date(),
      });

      results.push({
        success: true,
        messageId: logId,
        status: "sent",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Log the failure
      const logId = await createSmsLog(
        database,
        tenantId,
        recipient.employeeId,
        recipient.phoneNumber,
        message,
        notificationType,
        "failed"
      );

      await updateSmsLog(database, tenantId, logId, {
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
 * Updates SMS delivery status from Twilio webhook callback
 */
export async function updateDeliveryStatus(
  database: PrismaClient,
  tenantId: string,
  twilioSid: string,
  newStatus: "delivered" | "failed",
  errorMessage?: string
): Promise<void> {
  const log = await database.sms_logs.findFirst({
    where: {
      tenant_id: tenantId,
      twilio_sid: twilioSid,
    },
  });

  if (!log) {
    console.error(`SMS log not found for Twilio SID: ${twilioSid}`);
    return;
  }

  const updates: {
    status: SmsStatus;
    deliveredAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
  } = {
    status: newStatus,
  };

  if (newStatus === "delivered") {
    updates.deliveredAt = new Date();
  } else if (newStatus === "failed") {
    updates.failedAt = new Date();
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }
  }

  await updateSmsLog(database, tenantId, log.id, updates);
}

/**
 * Gets SMS logs for a tenant with optional filtering
 */
export async function getSmsLogs(
  database: PrismaClient,
  tenantId: string,
  options?: {
    employeeId?: string;
    notificationType?: string;
    status?: SmsStatus;
    limit?: number;
    offset?: number;
  }
): Promise<SmsLogEntry[]> {
  const logs = await database.sms_logs.findMany({
    where: {
      tenant_id: tenantId,
      ...(options?.employeeId && { employee_id: options.employeeId }),
      ...(options?.notificationType && {
        notification_type: options.notificationType,
      }),
      ...(options?.status && { status: options.status }),
    },
    orderBy: {
      created_at: "desc",
    },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });

  return logs.map((log) => ({
    id: log.id,
    tenantId: log.tenant_id,
    employeeId: log.employee_id ?? undefined,
    phoneNumber: log.phone_number,
    message: log.message,
    notificationType: log.notification_type,
    status: log.status as SmsStatus,
    twilioSid: log.twilio_sid ?? undefined,
    errorMessage: log.error_message ?? undefined,
    sentAt: log.sent_at ?? undefined,
    deliveredAt: log.delivered_at ?? undefined,
    failedAt: log.failed_at ?? undefined,
    createdAt: log.created_at,
  }));
}

/**
 * Sets SMS notification preference for an employee
 */
export async function setSmsPreference(
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
        channel: "sms",
      },
    },
    create: {
      tenant_id: tenantId,
      employee_id: employeeId,
      notification_type: notificationType,
      channel: "sms",
      is_enabled: isEnabled,
    },
    update: {
      is_enabled: isEnabled,
      updated_at: new Date(),
    },
  });
}

/**
 * Gets SMS notification preferences for an employee
 */
export async function getSmsPreferences(
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
      channel: "sms",
    },
  });

  return preferences.map((pref) => ({
    notificationType: pref.notification_type,
    isEnabled: pref.is_enabled,
    channel: pref.channel,
  }));
}
