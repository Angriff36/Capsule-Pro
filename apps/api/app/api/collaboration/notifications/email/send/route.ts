/**
 * POST /api/collaboration/notifications/email/send
 *
 * Send an email notification to one or more recipients
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  sendEmailFromTemplate,
  sendEmailNotification,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const sendEmailSchema = z.object({
  notificationType: z.string().min(1),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        employeeId: z.string().optional(),
        clientId: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  templateData: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional(),
  workflowId: z.string().optional(),
});

const sendFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  notificationType: z.string().min(1),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        employeeId: z.string().optional(),
        clientId: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .min(1),
  templateData: z.record(z.string(), z.union([z.string(), z.number()])),
  workflowId: z.string().optional(),
});

/**
 * POST /api/collaboration/notifications/email/send
 * Send an email notification
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

    // Check if using template or direct content
    const isTemplate = "templateId" in body;

    if (isTemplate) {
      const parsed = sendFromTemplateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const {
        templateId,
        notificationType,
        recipients,
        templateData,
        workflowId,
      } = parsed.data;

      const results = await sendEmailFromTemplate(database, {
        tenantId,
        templateId,
        notificationType,
        recipients,
        templateData,
        workflowId,
      });

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: failureCount === 0,
        message: `Sent ${successCount} email(s), ${failureCount} failed`,
        results,
      });
    }
    const parsed = sendEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      notificationType,
      recipients,
      subject,
      body: emailBody,
      templateData,
      workflowId,
    } = parsed.data;

    const results = await sendEmailNotification(database, {
      tenantId,
      notificationType,
      recipients,
      subject,
      body: emailBody,
      templateData,
      workflowId,
    });

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      message: `Sent ${successCount} email(s), ${failureCount} failed`,
      results,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send email: ${message}` },
      { status: 500 }
    );
  }
}
