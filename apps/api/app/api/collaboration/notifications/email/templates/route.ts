/**
 * GET /api/collaboration/notifications/email/templates
 * POST /api/collaboration/notifications/email/templates
 *
 * List or create email templates
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * GET /api/collaboration/notifications/email/templates
 * List all email templates for the tenant
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
    const templateType = searchParams.get("templateType");
    const isActive = searchParams.get("isActive");
    const isDefault = searchParams.get("isDefault");
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      tenant_id: tenantId,
      deleted_at: null,
    };

    if (templateType) {
      whereClause.template_type = templateType;
    }

    if (isActive !== null) {
      whereClause.is_active = isActive === "true";
    }

    if (isDefault !== null) {
      whereClause.is_default = isDefault === "true";
    }

    const [templates, totalCount] = await Promise.all([
      database.email_templates.findMany({
        where: whereClause,
        orderBy: [{ template_type: "asc" }, { name: "asc" }],
        skip: offset,
        take: limit,
      }),
      database.email_templates.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: templates,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch email templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collaboration/notifications/email/templates
 * Create a new email template
 */
export async function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "EmailTemplate",
    commandName: "create",
    transformBody: (body) => ({
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
