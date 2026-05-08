/**
 * POST /api/collaboration/notifications/email/webhook
 *
 * Handle Resend webhook callbacks for email delivery status updates.
 * Verifies HMAC-SHA256 signature before processing.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { database } from "@repo/database";
import {
  type EmailStatus,
  updateEmailDeliveryStatus,
} from "@repo/notifications";
import { captureException } from "@sentry/nextjs";

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
 * Verify Resend webhook signature.
 * Resend signs with HMAC-SHA256 and sends the signature in the
 * `resend-signature` header as `t=<timestamp>,v1=<signature>`.
 */
function verifyResendSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const parts = signatureHeader.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));
  if (!(timestampPart && signaturePart)) return false;

  const timestamp = timestampPart.slice(2);
  const signature = signaturePart.slice(3);

  // Reject stale signatures (>5 minutes old)
  const ageMs = Date.now() - Number(timestamp) * 1000;
  if (Number.isNaN(ageMs) || ageMs > 5 * 60 * 1000) return false;

  const hmac = createHmac("sha256", secret);
  hmac.update(`${timestamp}.${rawBody}`);
  const expected = hmac.digest("hex");

  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * POST /api/collaboration/notifications/email/webhook
 * Handle Resend webhook callbacks
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("resend-signature") ?? "";

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    if (!verifyResendSignature(rawBody, signatureHeader, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: ResendWebhookPayload = JSON.parse(rawBody);
    const { type, data } = payload;

    const resendId = data.email_id;
    const newStatus = mapEventTypeToStatus(type);

    // Find the email log by resend ID to determine the tenant.
    // The resend_id is globally unique (assigned by Resend), so this
    // cross-tenant lookup is safe — it only resolves which tenant
    // owns the email, then scopes the update to that tenant.
    const logs = await database.$queryRaw<
      Array<{ tenant_id: string; id: string }>
    >`
      SELECT tenant_id, id
      FROM email_logs
      WHERE resend_id = ${resendId}
      LIMIT 1
    `;

    if (!logs || logs.length === 0) {
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
    captureException(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process webhook: ${message}` },
      { status: 500 }
    );
  }
}
