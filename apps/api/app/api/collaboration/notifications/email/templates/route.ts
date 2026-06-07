/**
 * GET /api/collaboration/notifications/email/templates
 * POST /api/collaboration/notifications/email/templates
 *
 * List or create email templates
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (templateType) {
      whereClause.templateType = templateType;
    }

    if (isActive !== null) {
      whereClause.is_active = isActive === "true";
    }

    if (isDefault !== null) {
      whereClause.is_default = isDefault === "true";
    }

    const [templates, totalCount] = await Promise.all([
      database.emailTemplate.findMany({
        where: whereClause,
        orderBy: [{ templateType: "asc" }, { name: "asc" }],
        skip: offset,
        take: limit,
      }),
      database.emailTemplate.count({ where: whereClause }),
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
    log.error("Error fetching email templates:", error);
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
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

  return runManifestCommand({
    entity: "EmailTemplate",
    command: "create",
    body: {
      name: rawBody.name || "",
      templateType: rawBody.templateType || "custom",
      subject: rawBody.subject || "",
      body: rawBody.body || "",
      mergeFields: JSON.stringify(rawBody.mergeFields || []),
      isActive: rawBody.isActive ?? true,
      isDefault: rawBody.isDefault ?? false,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
