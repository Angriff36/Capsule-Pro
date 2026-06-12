/**
 * GET /api/collaboration/notifications/email/workflows/[id]
 * PUT /api/collaboration/notifications/email/workflows/[id]
 * DELETE /api/collaboration/notifications/email/workflows/[id]
 *
 * Get, update, or delete a specific email workflow
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

/**
 * GET /api/collaboration/notifications/email/workflows/[id]
 * Get a specific email workflow
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await database.emailWorkflow.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        emailTemplate: {
          select: {
            id: true,
            name: true,
            subject: true,
            body: true,
            templateType: true,
            mergeFields: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workflow,
    });
  } catch (error) {
    log.error("Failed to fetch email workflow:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch email workflow: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/collaboration/notifications/email/workflows/[id]
 * Update an email workflow
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "EmailWorkflow",
    command: "update",
    body: {
      id,
      name: rawBody.name || "",
      triggerConfig: JSON.stringify(rawBody.triggerConfig || {}),
      emailTemplateId: rawBody.emailTemplateId ?? "",
      recipientConfig: JSON.stringify(rawBody.recipientConfig || {}),
      isActive: rawBody.isActive ?? true,
    },
    instanceId: id,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/collaboration/notifications/email/workflows/[id]
 * Soft delete an email workflow
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);

  return runManifestCommand({
    entity: "EmailWorkflow",
    command: "softDelete",
    body: { id },
    instanceId: id,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
