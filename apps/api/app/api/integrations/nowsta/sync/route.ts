/**
 * POST /api/integrations/nowsta/sync
 *
 * Trigger a Nowsta sync operation
 */

import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runNowstaSync } from "@/app/lib/nowsta-sync-service";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const syncRequestSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  dryRun: z.boolean().default(false),
});

/**
 * POST /api/integrations/nowsta/sync
 * Trigger a sync operation
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
    const parsed = syncRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { startDate, endDate, dryRun } = parsed.data;

    // Validate date range
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Limit date range to prevent excessive syncs
    const maxDays = 90;
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > maxDays) {
      return NextResponse.json(
        { error: `Date range cannot exceed ${maxDays} days` },
        { status: 400 }
      );
    }

    const result = await runNowstaSync(tenantId, {
      startDate,
      endDate,
      dryRun,
    });

    return NextResponse.json({
      success: result.success,
      dryRun,
      result: {
        employeesImported: result.employeesImported,
        employeesSkipped: result.employeesSkipped,
        shiftsImported: result.shiftsImported,
        shiftsSkipped: result.shiftsSkipped,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("Nowsta sync failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Sync failed: ${message}` },
      { status: 500 }
    );
  }
}
