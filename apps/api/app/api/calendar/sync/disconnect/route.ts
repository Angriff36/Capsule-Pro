import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { env } from "@/env";

const SUPPORTED_PROVIDERS = ["google", "outlook"] as const;

/**
 * Attempt to revoke an OAuth token at the provider.
 * Failures are logged but never block the local disconnect flow.
 */
async function revokeProviderToken(
  provider: string,
  accessToken: string | null,
  refreshToken: string | null
): Promise<void> {
  const token = accessToken || refreshToken;
  if (!token) {
    log.info(
      `[calendar/sync/disconnect] No token stored for ${provider}, skipping revocation`
    );
    return;
  }

  try {
    if (provider === "google") {
      // Google supports revoking both access and refresh tokens via the same endpoint.
      // https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
      const res = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
        { method: "POST" }
      );
      if (res.ok) {
        log.info(
          "[calendar/sync/disconnect] Google token revoked successfully"
        );
      } else {
        const text = await res.text().catch(() => "");
        log.warn(
          `[calendar/sync/disconnect] Google token revocation returned ${res.status}: ${text}`
        );
      }
    } else if (provider === "outlook") {
      // Microsoft Entra ID does not expose a direct token-revocation REST endpoint
      // for confidential clients. The recommended server-side approach is to invalidate
      // the refresh token by posting a revocation request to the token endpoint with
      // grant_type=refresh_token + the refresh_token value, which marks it as revoked.
      // If that is unavailable, we best-effort call the logout endpoint to end the session.
      const clientId = env.MICROSOFT_CLIENT_ID;
      const clientSecret = env.MICROSOFT_CLIENT_SECRET;

      if (refreshToken && clientId && clientSecret) {
        // Revoke by exchanging the refresh token for nothing — Entra ID marks it consumed.
        // A more targeted approach: use the admin consent revocation URL or
        // POST to the token endpoint which invalidates the previous refresh token.
        // We use the standard logout endpoint to invalidate the session server-side.
        const res = await fetch(
          "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              refresh_token: refreshToken,
            }).toString(),
          }
        );
        if (res.ok) {
          log.info(
            "[calendar/sync/disconnect] Microsoft session logged out successfully"
          );
        } else {
          const text = await res.text().catch(() => "");
          log.warn(
            `[calendar/sync/disconnect] Microsoft session logout returned ${res.status}: ${text}`
          );
        }
      } else {
        log.info(
          "[calendar/sync/disconnect] Microsoft: insufficient credentials or no refresh token, skipping revocation"
        );
      }
    }
  } catch (error) {
    // Never block disconnect on revocation failure — tokens are being nulled locally.
    log.warn(
      `[calendar/sync/disconnect] ${provider} token revocation failed (non-blocking):`,
      error
    );
  }
}

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

    if (
      !(
        provider &&
        (SUPPORTED_PROVIDERS as readonly string[]).includes(provider)
      )
    ) {
      return NextResponse.json(
        {
          error: `Unsupported provider. Must be one of: ${SUPPORTED_PROVIDERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { database } = await import("@repo/database");

    // Fetch current tokens BEFORE clearing them so we can revoke at the provider.
    const existingSync = await database.providerSync.findFirst({
      where: {
        tenantId,
        provider,
        deletedAt: null,
      },
      select: {
        accessToken: true,
        refreshToken: true,
      },
    });

    // Attempt provider-side revocation — failures are logged, never block local cleanup.
    if (existingSync) {
      await revokeProviderToken(
        provider,
        existingSync.accessToken,
        existingSync.refreshToken
      );
    }

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
