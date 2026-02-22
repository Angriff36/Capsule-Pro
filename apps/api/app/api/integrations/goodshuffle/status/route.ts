/**
 * GET /api/integrations/goodshuffle/status
 *
 * Get Goodshuffle sync status
 */

import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getGoodshuffleSyncStatus } from "@/app/lib/goodshuffle-event-sync-service";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/integrations/goodshuffle/status
 * Get current sync status
 */
export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const status = await getGoodshuffleSyncStatus(tenantId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get Goodshuffle sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
