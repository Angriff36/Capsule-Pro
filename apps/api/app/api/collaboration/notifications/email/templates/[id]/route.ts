/**
 * GET /api/collaboration/notifications/email/templates/[id]
 * PUT /api/collaboration/notifications/email/templates/[id]
 * DELETE /api/collaboration/notifications/email/templates/[id]
 *
 * Get, update, or delete a specific email template
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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

    const template = await database.email_templates.findFirst({
      where: {
        tenant_id: tenantId,
        id,
        deleted_at: null,
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
    console.error("Error fetching email template:", error);
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

  return executeManifestCommand(request, {
    entityName: "EmailTemplate",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({
      id,
      name: body.name || "",
      templateType: body.templateType || "custom",
      subject: body.subject || "",
      body: body.body || "",
      mergeFields: JSON.stringify(body.mergeFields || []),
      isActive: body.isActive ?? true,
      isDefault: body.isDefault ?? false,
    }),
  });
}

/**
 * DELETE /api/collaboration/notifications/email/templates/[id]
 * Soft delete an email template
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return executeManifestCommand(request, {
    entityName: "EmailTemplate",
    commandName: "softDelete",
    params: { id },
    transformBody: () => ({ id }),
  });
}
