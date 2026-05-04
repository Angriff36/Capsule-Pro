import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

/**
 * GET /api/crm/proposals/templates
 * List all active proposal templates
 */
export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const templates = await database.proposalTemplate.findMany({
      where: {
        AND: [{ tenantId }, { deletedAt: null }],
      },
      select: {
        id: true,
        name: true,
        eventType: true,
        isDefault: true,
        isActive: true,
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    captureException(error);
    log.error("Error fetching proposal templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
