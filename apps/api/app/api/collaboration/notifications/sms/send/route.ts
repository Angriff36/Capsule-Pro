/**
 * POST /api/collaboration/notifications/sms/send
 *
 * Send SMS notifications to one or more recipients
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  sendSmsNotification,
  type SendSmsOptions,
  type SmsRecipient,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
    console.error("SMS send failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send SMS: ${message}` },
      { status: 500 }
    );
  }
}
