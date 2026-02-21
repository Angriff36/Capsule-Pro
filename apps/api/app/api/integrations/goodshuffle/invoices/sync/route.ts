/**
 * POST /api/integrations/goodshuffle/invoices/sync
 *
 * Trigger a Goodshuffle invoice sync
 */

import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runGoodshuffleInvoiceSync } from "@/app/lib/goodshuffle-invoice-sync-service";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const syncSchema = z.object({
  startDate: z
    .string()
    .transform((v) => new Date(v))
    .optional(),
  endDate: z
    .string()
    .transform((v) => new Date(v))
    .optional(),
  dryRun: z.boolean().default(false),
  direction: z
    .enum(["convoy_to_goodshuffle", "goodshuffle_to_convoy", "both"])
    .default("goodshuffle_to_convoy"),
});

/**
 * POST /api/integrations/goodshuffle/invoices/sync
 * Trigger an invoice sync between Goodshuffle and Convoy
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

    // Validate date range if both provided
    if (startDate && endDate && startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const result = await runGoodshuffleInvoiceSync(tenantId, {
      startDate,
      endDate,
      dryRun,
      direction,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to run Goodshuffle invoice sync:", error);
    return NextResponse.json(
      { error: "Failed to run invoice sync" },
      { status: 500 }
    );
  }
}
