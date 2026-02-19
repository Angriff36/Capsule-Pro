/**
 * POST /api/integrations/goodshuffle/sync
 *
 * Trigger a Goodshuffle event sync
 */

import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runGoodshuffleEventSync } from "@/app/lib/goodshuffle-event-sync-service";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const syncSchema = z.object({
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
  dryRun: z.boolean().default(false),
  direction: z
    .enum(["convoy_to_goodshuffle", "goodshuffle_to_convoy", "both"])
    .default("goodshuffle_to_convoy"),
});

/**
 * POST /api/integrations/goodshuffle/sync
 * Trigger a sync between Goodshuffle and Convoy
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

    const { startDate, endDate, dryRun, direction } = parsed.data;

    // Validate date range
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const result = await runGoodshuffleEventSync(tenantId, {
      startDate,
      endDate,
      dryRun,
      direction,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to run Goodshuffle sync:", error);
    return NextResponse.json(
      { error: "Failed to run sync" },
      { status: 500 }
    );
  }
}
