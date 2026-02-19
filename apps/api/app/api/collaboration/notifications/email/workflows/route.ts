/**
 * GET /api/collaboration/notifications/email/workflows
 * POST /api/collaboration/notifications/email/workflows
 *
 * List or create email workflow configurations
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  triggerType: z.enum([
    "event_confirmed",
    "event_canceled",
    "event_completed",
    "task_assigned",
    "task_completed",
    "task_reminder",
    "shift_reminder",
    "proposal_sent",
    "contract_signed",
    "custom",
  ]),
  triggerConfig: z.record(z.unknown()).optional(),
  emailTemplateId: z.string().optional(),
  recipientConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/collaboration/notifications/email/workflows
 * List all email workflows for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const triggerType = searchParams.get("triggerType");
    const isActive = searchParams.get("isActive");

    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (triggerType) {
      whereClause.triggerType = triggerType;
    }

    if (isActive !== null) {
      whereClause.isActive = isActive === "true";
    }

    const workflows = await database.emailWorkflow.findMany({
      where: whereClause,
      include: {
        emailTemplate: {
          select: {
            id: true,
            name: true,
            subject: true,
            template_type: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      workflows,
    });
  } catch (error) {
    console.error("Failed to fetch email workflows:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch email workflows: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collaboration/notifications/email/workflows
 * Create a new email workflow
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
    const parsed = createWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      name,
      triggerType,
      triggerConfig,
      emailTemplateId,
      recipientConfig,
      isActive,
    } = parsed.data;

    // If template ID is provided, verify it exists and belongs to the tenant
    if (emailTemplateId) {
      const template = await database.email_templates.findFirst({
        where: {
          tenant_id: tenantId,
          id: emailTemplateId,
          is_active: true,
          deleted_at: null,
        },
      });

      if (!template) {
        return NextResponse.json(
          { error: "Email template not found or inactive" },
          { status: 400 }
        );
      }
    }

    const workflow = await database.emailWorkflow.create({
      data: {
        tenantId,
        name,
        triggerType,
        triggerConfig: triggerConfig ?? {},
        emailTemplateId: emailTemplateId ?? null,
        emailTemplateTenantId: emailTemplateId ? tenantId : null,
        recipientConfig: recipientConfig ?? {},
        isActive: isActive ?? true,
      },
      include: {
        emailTemplate: {
          select: {
            id: true,
            name: true,
            subject: true,
            template_type: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Failed to create email workflow:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create email workflow: ${message}` },
      { status: 500 }
    );
  }
}
