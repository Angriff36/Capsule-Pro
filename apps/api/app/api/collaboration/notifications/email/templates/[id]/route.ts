/**
 * GET /api/collaboration/notifications/email/templates/[id]
 * PUT /api/collaboration/notifications/email/templates/[id]
 * DELETE /api/collaboration/notifications/email/templates/[id]
 *
 * Get, update, or delete a specific email template
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/collaboration/notifications/email/templates/[id]
 * Get a specific email template by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await context.params;

    const template = await database.emailTemplate.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    log.error("Error fetching email template:", error);
    return NextResponse.json(
      { error: "Failed to fetch email template" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/collaboration/notifications/email/templates/[id]
 * Update an email template
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "EmailTemplate",
    command: "update",
    body: {
      id,
      name: rawBody.name || "",
      templateType: rawBody.templateType || "custom",
      subject: rawBody.subject || "",
      body: rawBody.body || "",
      mergeFields: JSON.stringify(rawBody.mergeFields || []),
      isActive: rawBody.isActive ?? true,
      isDefault: rawBody.isDefault ?? false,
    },
    instanceId: id,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/collaboration/notifications/email/templates/[id]
 * Soft delete an email template
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);

  return runManifestCommand({
    entity: "EmailTemplate",
    command: "softDelete",
    body: { id },
    instanceId: id,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
