import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { database } = await import("@repo/database");

    const syncs = await database.providerSync.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        provider: true,
        providerUserId: true,
        calendarId: true,
        calendarName: true,
        status: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        syncDirection: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      syncs: syncs.map((s) => ({
        ...s,
        hasToken: !!s.providerUserId,
        // Never expose tokens
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiry: undefined,
      })),
    });
  } catch (error) {
    captureException(error);
    log.error("[calendar/sync/status] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}
