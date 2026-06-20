import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { scanOvertimeRisk } from "@/lib/staff/overtime-prevention";

export const runtime = "nodejs";

/**
 * GET /api/staff/overtime-alerts
 * Scan scheduled shifts for overtime risk in a date range.
 *
 * Query: startDate, endDate (ISO), locationId (optional)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");
  const locationId = searchParams.get("locationId") ?? undefined;

  const endDate = endParam ? new Date(endParam) : new Date();
  const startDate = startParam
    ? new Date(startParam)
    : new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json(
      { message: "Invalid startDate or endDate" },
      { status: 400 }
    );
  }

  try {
    const result = await scanOvertimeRisk({
      tenantId,
      startDate,
      endDate,
      locationId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error("Failed to scan overtime alerts", { error });
    return NextResponse.json(
      { message: "Failed to scan overtime alerts" },
      { status: 500 }
    );
  }
}
