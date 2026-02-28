/**
 * POST /api/integrations/goodshuffle/inventory/sync
 *
 * Trigger a Goodshuffle inventory sync
 */

import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runGoodshuffleInventorySync } from "@/app/lib/goodshuffle-inventory-sync-service";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const syncSchema = z.object({
  dryRun: z.boolean().default(false),
  direction: z
    .enum(["convoy_to_goodshuffle", "goodshuffle_to_convoy", "both"])
    .default("goodshuffle_to_convoy"),
});

/**
 * POST /api/integrations/goodshuffle/inventory/sync
 * Trigger an inventory sync between Goodshuffle and Convoy
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { dryRun, direction } = parsed.data;

    const result = await runGoodshuffleInventorySync(tenantId, {
      dryRun,
      direction,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to run Goodshuffle inventory sync:", error);
    return NextResponse.json(
      { error: "Failed to run inventory sync" },
      { status: 500 }
    );
  }
}
