/**
 * GET /api/collaboration/notifications/email/workflows/[id]
 * PUT /api/collaboration/notifications/email/workflows/[id]
 * DELETE /api/collaboration/notifications/email/workflows/[id]
 *
 * Get, update, or delete a specific email workflow
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
            template_type: true,
            merge_fields: true,
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
    console.error("Failed to fetch email workflow:", error);
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
export function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return context.params.then(({ id }) =>
    executeManifestCommand(request, {
      entityName: "EmailWorkflow",
      commandName: "update",
      params: { id },
      transformBody: (body) => ({
        id,
        name: body.name || "",
        triggerConfig: JSON.stringify(body.triggerConfig || {}),
        emailTemplateId: body.emailTemplateId ?? "",
        recipientConfig: JSON.stringify(body.recipientConfig || {}),
        isActive: body.isActive ?? true,
      }),
    })
  );
}

/**
 * DELETE /api/collaboration/notifications/email/workflows/[id]
 * Soft delete an email workflow
 */
export function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return context.params.then(({ id }) =>
    executeManifestCommand(request, {
      entityName: "EmailWorkflow",
      commandName: "softDelete",
      params: { id },
      transformBody: () => ({ id }),
    })
  );
}
