/**
 * POST /api/collaboration/notifications/sms/webhook
 *
 * Handle Twilio delivery status callbacks
 */

import { database } from "@repo/database";
import { updateDeliveryStatus } from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";

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
  try {
    const formData = await request.formData();
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = formData.get("MessageStatus") as string;
    const errorCode = formData.get("ErrorCode") as string | null;
    const errorMessage = formData.get("ErrorMessage") as string | null;

    if (!(messageSid && messageStatus)) {
      return NextResponse.json(
        { error: "Missing required fields: MessageSid or MessageStatus" },
        { status: 400 }
      );
    }

    // Find the SMS log by Twilio SID
    const log = await database.sms_logs.findFirst({
      where: {
        twilio_sid: messageSid,
      },
    });

    if (!log) {
      console.error(`SMS log not found for Twilio SID: ${messageSid}`);
      // Still return 200 to prevent Twilio from retrying
      return NextResponse.json({ received: true, warning: "Log not found" });
    }

    // Map Twilio status to our status
    let newStatus: "delivered" | "failed" | null = null;
    const error = errorCode
      ? `${errorCode}: ${errorMessage ?? "Unknown error"}`
      : undefined;

    switch (messageStatus) {
      case "delivered":
        newStatus = "delivered";
        break;
      case "failed":
      case "undelivered":
        newStatus = "failed";
        break;
      case "sent":
      case "queued":
        // Don't update for these intermediate statuses
        break;
      default:
        // Unknown status - log but don't fail
        console.warn(`Unknown Twilio message status: ${messageStatus}`);
        break;
    }

    if (newStatus) {
      await updateDeliveryStatus(
        database,
        log.tenant_id,
        messageSid,
        newStatus,
        error
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process SMS webhook:", error);
    // Return 200 to prevent Twilio from retrying on server errors
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}
