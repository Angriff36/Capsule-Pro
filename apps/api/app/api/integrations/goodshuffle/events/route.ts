/**
 * GET /api/integrations/goodshuffle/events
 *
 * List Goodshuffle event sync records
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/integrations/goodshuffle/events
 * List event sync records with optional filtering
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
    const status = searchParams.get("status");
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    const where = {
      tenantId,
      ...(status ? { status } : {}),
    };

    const [syncs, total] = await Promise.all([
      database.goodshuffleEventSync.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.goodshuffleEventSync.count({ where }),
    ]);

    return NextResponse.json({
      syncs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to list Goodshuffle event syncs:", error);
    return NextResponse.json(
      { error: "Failed to list event syncs" },
      { status: 500 }
    );
  }
}
