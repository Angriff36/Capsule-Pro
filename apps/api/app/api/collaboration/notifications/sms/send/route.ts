/**
 * POST /api/collaboration/notifications/sms/send
 *
 * Send SMS notifications to one or more recipients
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  type SendSmsOptions,
  type SmsRecipient,
  sendSmsNotification,
} from "@repo/notifications";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  humanizeNotificationType,
  mirrorSendsToNotifications,
} from "@/app/lib/notification-mirror";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const sendSmsSchema = z.object({
  notificationType: z.string().min(1),
  recipients: z
    .array(
      z.object({
        employeeId: z.string().optional(),
        phoneNumber: z.string().min(1),
      })
    )
    .min(1),
  templateData: z.record(z.string(), z.union([z.string(), z.number()])),
  customMessage: z.string().optional(),
});

/**
 * POST /api/collaboration/notifications/sms/send
 * Send SMS notifications to one or more recipients
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = sendSmsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { notificationType, recipients, templateData, customMessage } =
      parsed.data;

    const options: SendSmsOptions = {
      tenantId,
      notificationType,
      recipients: recipients as SmsRecipient[],
      templateData,
      customMessage,
    };

    const results = await sendSmsNotification(database, options);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Mirror delivered SMS into governed in-app notifications. The rendered SMS
    // text is computed inside the service (not returned), so the title is
    // derived from the notification type.
    await mirrorSendsToNotifications({
      tenantId,
      notificationType,
      title: humanizeNotificationType(notificationType),
      body: "",
      recipients,
      results,
    });

    return NextResponse.json({
      success: failureCount === 0,
      summary: {
        total: results.length,
        sent: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error) {
    captureException(error);
    log.error("SMS send failed:", error);

    // Sanitize known provider-not-configured errors before sending to client
    const raw = error instanceof Error ? error.message : "Unknown error";
    if (raw.includes("not configured")) {
      return NextResponse.json(
        {
          error:
            "SMS service is not configured. Please contact your administrator.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send SMS. Please try again later." },
      { status: 500 }
    );
  }
}
