/**
 * POST /api/collaboration/notifications/sms/webhook
 *
 * Handle Twilio delivery status callbacks
 * Requires signature verification via X-Twilio-Signature header
 *
 * SECURITY: Twilio signs webhooks using HMAC-SHA1. The signature is sent in
 * the X-Twilio-Signature header as base64-encoded. We verify by computing
 * HMAC-SHA1(authToken, rawBody) and comparing with timing-safe comparison.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { updateDeliveryStatus } from "@repo/notifications";
import { keys } from "@repo/notifications/keys";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Verify Twilio webhook signature
 *
 * Twilio signs webhooks using HMAC-SHA1 with the auth token as the secret.
 * The signature is sent in the X-Twilio-Signature header as base64-encoded.
 */
function verifyTwilioSignature(
  authToken: string,
  signature: string,
  rawBody: string
): boolean {
  const expectedSignature = createHmac("sha1", authToken)
    .update(rawBody)
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Process a Twilio delivery status update
 */
async function processStatusUpdate(
  messageSid: string,
  messageStatus: string,
  errorCode: string | null,
  errorMessage: string | null
): Promise<NextResponse> {
  const smsLog = await database.sms_logs.findFirst({
    where: {
      twilio_sid: messageSid,
    },
  });

  if (!smsLog) {
    log.error(`SMS log not found for Twilio SID: ${messageSid}`);
    // Still return 200 to prevent Twilio from retrying
    return NextResponse.json({ received: true, warning: "Log not found" });
  }

  const newStatus = mapTwilioStatus(messageStatus);
  const error = errorCode
    ? `${errorCode}: ${errorMessage ?? "Unknown error"}`
    : undefined;

  if (newStatus) {
    await updateDeliveryStatus(
      database,
      smsLog.tenant_id,
      messageSid,
      newStatus,
      error
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Map Twilio status to our internal status
 */
function mapTwilioStatus(messageStatus: string): "delivered" | "failed" | null {
  switch (messageStatus) {
    case "delivered":
      return "delivered";
    case "failed":
    case "undelivered":
      return "failed";
    case "sent":
    case "queued":
      // Don't update for these intermediate statuses
      return null;
    default:
      log.warn(`Unknown Twilio message status: ${messageStatus}`);
      return null;
  }
}

/**
 * POST /api/collaboration/notifications/sms/webhook
 * Handle Twilio delivery status webhook
 *
 * Twilio sends these fields:
 * - MessageSid: The SID of the message
 * - MessageStatus: one of queued, failed, sent, delivered, or undelivered
 * - ErrorCode: (optional) error code if failed
 * - ErrorMessage: (optional) error message if failed
 */
export async function POST(request: NextRequest) {
  const env = keys();
  const authToken = env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    return NextResponse.json(
      { error: "Webhook auth token not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Twilio-Signature header" },
      { status: 401 }
    );
  }

  const rawBody = await request.text();

  if (!verifyTwilioSignature(authToken, signature, rawBody)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const formData = new URLSearchParams(rawBody);
  const messageSid = formData.get("MessageSid");
  const messageStatus = formData.get("MessageStatus");
  const errorCode = formData.get("ErrorCode");
  const errorMessage = formData.get("ErrorMessage");

  if (!(messageSid && messageStatus)) {
    return NextResponse.json(
      { error: "Missing required fields: MessageSid or MessageStatus" },
      { status: 400 }
    );
  }

  try {
    return await processStatusUpdate(
      messageSid,
      messageStatus,
      errorCode,
      errorMessage
    );
  } catch (error) {
    captureException(error);
    log.error("Failed to process SMS webhook", { error });
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

