import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

const SUPPORTED_PROVIDERS = ["google", "outlook"] as const;

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const { provider } = body as { provider: string };

    if (!(provider && SUPPORTED_PROVIDERS.includes(provider as any))) {
      return NextResponse.json(
        {
          error: `Unsupported provider. Must be one of: ${SUPPORTED_PROVIDERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { database } = await import("@repo/database");

    // Soft delete the sync record and clear tokens
    const result = await database.providerSync.updateMany({
      where: {
        tenantId,
        provider,
        deletedAt: null,
      },
      data: {
        status: "disconnected",
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        providerUserId: null,
        calendarId: null,
        calendarName: null,
        lastSyncError: null,
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: `No ${provider} sync found to disconnect` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected successfully`,
    });
  } catch (error) {
    captureException(error);
    log.error("[calendar/sync/disconnect] Error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect provider" },
      { status: 500 }
    );
  }
}
