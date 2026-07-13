/**
 * GET /api/integrations/goodshuffle/invoices
 *
 * List Goodshuffle invoice sync records
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit, clampOffset } from "@/lib/pagination";

/**
 * GET /api/integrations/goodshuffle/invoices
 * List invoice sync records with optional filtering
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
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const where = {
      tenantId,
      ...(status ? { status } : {}),
    };

    const [syncs, total] = await Promise.all([
      database.goodshuffleInvoiceSync.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.goodshuffleInvoiceSync.count({ where }),
    ]);

    return NextResponse.json({
      syncs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    captureException(error);
    log.error("Failed to list Goodshuffle invoice syncs:", error);
    return NextResponse.json(
      { error: "Failed to list invoice syncs" },
      { status: 500 }
    );
  }
}
