/**
 * GET /api/collaboration/notifications/email/workflows
 * POST /api/collaboration/notifications/email/workflows
 *
 * List or create email workflow configurations
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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
            templateType: true,
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
    log.error("Failed to fetch email workflows:", error);
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
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "EmailWorkflow",
    command: "create",
    body: {
      name: rawBody.name || "",
      triggerType: rawBody.triggerType || "custom",
      triggerConfig: JSON.stringify(rawBody.triggerConfig || {}),
      emailTemplateId: rawBody.emailTemplateId || "",
      recipientConfig: JSON.stringify(rawBody.recipientConfig || {}),
      isActive: rawBody.isActive ?? true,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
