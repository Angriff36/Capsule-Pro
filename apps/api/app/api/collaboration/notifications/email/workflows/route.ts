/**
 * GET /api/collaboration/notifications/email/workflows
 * POST /api/collaboration/notifications/email/workflows
 *
 * List or create email workflow configurations
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "EmailWorkflow",
    commandName: "create",
    transformBody: (body) => ({
      name: body.name || "",
      triggerType: body.triggerType || "custom",
      triggerConfig: JSON.stringify(body.triggerConfig || {}),
      emailTemplateId: body.emailTemplateId || "",
      recipientConfig: JSON.stringify(body.recipientConfig || {}),
      isActive: body.isActive ?? true,
    }),
  });
}
