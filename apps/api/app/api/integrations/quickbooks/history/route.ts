/**
 * GET /api/integrations/quickbooks/history
 *
 * Return recent QuickBooks export history.
 * Currently returns an empty list until a persistence model is added.
 */

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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

    // Placeholder — no persistence model yet
    return NextResponse.json({ exports: [] });
  } catch (error) {
    captureException(error);
    log.error("Failed to get QuickBooks export history:", error);
    return NextResponse.json(
      { error: "Failed to get export history" },
      { status: 500 }
    );
  }
}
