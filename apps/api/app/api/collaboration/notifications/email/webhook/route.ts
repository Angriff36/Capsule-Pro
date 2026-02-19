/**
 * POST /api/collaboration/notifications/email/webhook
 *
 * Handle Resend webhook callbacks for email delivery status updates
 */

import { database } from "@repo/database";
import {
  type EmailStatus,
  updateEmailDeliveryStatus,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Resend webhook event types
 */
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.opened"
  | "email.bounced"
  | "email.clicked";

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

/**
 * Maps Resend event types to our email status
 */
function mapEventTypeToStatus(eventType: ResendEventType): EmailStatus {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.opened":
      return "opened";
    case "email.bounced":
      return "bounced";
    default:
      return "sent";
  }
}

/**
 * POST /api/collaboration/notifications/email/webhook
 * Handle Resend webhook callbacks
 *
 * Note: In production, you should verify the webhook signature
 * using Resend's signing secret for security.
 */
export async function POST(request: NextRequest) {
  try {
    // Note: Webhooks from Resend won't have auth headers
    // We need to identify the tenant from the email log

    const payload: ResendWebhookPayload = await request.json();
    const { type, data } = payload;

    const resendId = data.email_id;
    const newStatus = mapEventTypeToStatus(type);

    // Find the email log by resend ID to get the tenant
    // Since we need tenantId to query, we'll search across logs
    // In production, you might want to store a mapping or use a different approach

    // For now, we'll update the status by searching for the resend ID
    // This requires a raw query since we don't know the tenant ID yet
    const logs = await database.$queryRaw<
      Array<{ tenant_id: string; id: string }>
    >`
      SELECT tenant_id, id
      FROM email_logs
      WHERE resend_id = ${resendId}
      LIMIT 1
    `;

    if (!logs || logs.length === 0) {
      console.warn(`Email log not found for Resend ID: ${resendId}`);
      return NextResponse.json({ received: true, message: "Log not found" });
    }

    const log = logs[0];
    if (!log) {
      return NextResponse.json({ received: true, message: "Log not found" });
    }

    await updateEmailDeliveryStatus(
      database,
      log.tenant_id,
      resendId,
      newStatus
    );

    return NextResponse.json({
      received: true,
      message: `Updated status to ${newStatus}`,
    });
  } catch (error) {
    console.error("Failed to process email webhook:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process webhook: ${message}` },
      { status: 500 }
    );
  }
}
