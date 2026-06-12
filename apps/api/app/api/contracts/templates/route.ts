/**
 * Contract Templates API
 *
 * GET /api/contracts/templates - List contract templates for a tenant
 *
 * Note: There is no ContractTemplate Prisma model yet. This route returns a
 * structured response derived from existing EventContract and VendorContract
 * data, providing a template-like view. When a dedicated ContractTemplate model
 * is added, this handler should query it directly.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface TemplateRow {
  createdAt: string;
  description: string | null;
  id: string;
  lastModified: string;
  name: string;
  type: "event" | "vendor";
  usageCount: number;
}

/**
 * Derive template-like entries from existing contract data.
 * Groups contracts by documentType (event) or contractType (vendor) to
 * approximate reusable templates. Returns an empty array when no contracts
 * exist, keeping the UI functional without a dedicated model.
 */
async function deriveTemplates(tenantId: string): Promise<TemplateRow[]> {
  const templates: TemplateRow[] = [];

  // Event contracts grouped by documentType
  const eventGroups = await database.eventContract.groupBy({
    by: ["documentType"],
    where: {
      tenantId,
      deletedAt: null,
      documentType: { not: null },
    },
    _count: { id: true },
    _max: { updatedAt: true },
    _min: { createdAt: true },
  });

  for (const group of eventGroups) {
    if (!group.documentType) {
      continue;
    }
    templates.push({
      id: `event-${group.documentType}`,
      name: group.documentType
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      type: "event",
      description: `Standard ${group.documentType} event contract template`,
      usageCount: group._count.id,
      lastModified:
        group._max.updatedAt?.toISOString() ?? new Date().toISOString(),
      createdAt:
        group._min.createdAt?.toISOString() ?? new Date().toISOString(),
    });
  }

  // Vendor contracts grouped by contractType
  const vendorGroups = await database.vendorContract.groupBy({
    by: ["contractType"],
    where: {
      tenantId,
      deletedAt: null,
    },
    _count: { id: true },
    _max: { updatedAt: true },
    _min: { createdAt: true },
  });

  for (const group of vendorGroups) {
    templates.push({
      id: `vendor-${group.contractType}`,
      name: group.contractType
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      type: "vendor",
      description: `${group.contractType} vendor contract template`,
      usageCount: group._count.id,
      lastModified:
        group._max.updatedAt?.toISOString() ?? new Date().toISOString(),
      createdAt:
        group._min.createdAt?.toISOString() ?? new Date().toISOString(),
    });
  }

  return templates;
}

/**
 * GET /api/contracts/templates
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");

    let templates = await deriveTemplates(tenantId);

    if (typeParam === "event" || typeParam === "vendor") {
      templates = templates.filter((t) => t.type === typeParam);
    }

    return NextResponse.json({ data: templates });
  } catch (error) {
    log.error("Error listing contract templates:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
