/**
 * CRM Lead Score Distribution API
 *
 * GET /api/crm/scoring/distribution — Get score distribution (hot/warm/cold counts)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

export const runtime = "nodejs";

// GET /api/crm/scoring/distribution
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const distribution = await database.$queryRaw<
      Array<{ bucket: string; count: bigint }>
    >(
      Prisma.sql`
        SELECT
          CASE
            WHEN score >= 80 THEN 'hot'
            WHEN score >= 50 THEN 'warm'
            ELSE 'cold'
          END AS bucket,
          COUNT(*)::bigint AS count
        FROM tenant_crm.leads
        WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
        GROUP BY bucket
      `
    );

    const distMap: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
    for (const row of distribution) {
      distMap[row.bucket] = Number(row.count);
    }

    return NextResponse.json({ data: distMap });
  } catch (error) {
    captureException(error);
    log.error("Error fetching distribution:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
