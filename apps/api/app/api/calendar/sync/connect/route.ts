import { createHmac } from "node:crypto";
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { env } from "@/env";

const SUPPORTED_PROVIDERS = ["google", "outlook"] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

// OAuth 2.0 endpoints
const OAUTH_CONFIG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/User.Read",
      "offline_access",
    ],
  },
} as const;

/**
 * POST /api/calendar/sync/connect
 * Body: { provider: "google" | "outlook", action: "initiate" | "store_tokens" }
 *
 * If action=initiate: returns the OAuth authorization URL to redirect the user to.
 * If action=store_tokens: stores tokens directly (for testing/manual setup).
 */
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
    const { provider, action } = body as {
      provider: Provider;
      action: "initiate" | "store_tokens";
    };

    if (!(provider && SUPPORTED_PROVIDERS.includes(provider))) {
      return NextResponse.json(
        {
          error: `Unsupported provider. Must be one of: ${SUPPORTED_PROVIDERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (action === "store_tokens") {
      const {
        accessToken,
        refreshToken,
        tokenExpiry,
        providerUserId,
        calendarId,
        calendarName,
      } = body as {
        accessToken?: string;
        refreshToken?: string;
        tokenExpiry?: string;
        providerUserId?: string;
        calendarId?: string;
        calendarName?: string;
      };

      if (!accessToken) {
        return NextResponse.json(
          { error: "accessToken is required for store_tokens action" },
          { status: 400 }
        );
      }

      const { database } = await import("@repo/database");

      await database.providerSync.upsert({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
        create: {
          tenantId,
          provider,
          accessToken,
          refreshToken: refreshToken ?? null,
          tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
          providerUserId: providerUserId ?? null,
          calendarId: calendarId ?? null,
          calendarName: calendarName ?? null,
          status: "connected",
        },
        update: {
          accessToken,
          refreshToken: refreshToken ?? null,
          tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
          providerUserId: providerUserId ?? null,
          calendarId: calendarId ?? null,
          calendarName: calendarName ?? null,
          status: "connected",
          lastSyncError: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${provider} connected successfully`,
      });
    }

    if (action === "initiate") {
      const clientId =
        provider === "google" ? env.GOOGLE_CLIENT_ID : env.MICROSOFT_CLIENT_ID;

      if (!clientId) {
        return NextResponse.json(
          {
            error: `${provider} OAuth is not configured. Set ${provider.toUpperCase()}_CLIENT_ID in environment variables.`,
          },
          { status: 503 }
        );
      }

      const redirectUri = `${env.OAUTH_REDIRECT_URI}/api/calendar/sync/callback/${provider}`;
      const config = OAUTH_CONFIG[provider];

      // Generate HMAC-signed state token with expiry
      const ts = Date.now();
      const secret =
        env.CALENDAR_SYNC_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
      const sig = createHmac("sha256", secret)
        .update(JSON.stringify({ tenantId, provider, ts }))
        .digest("hex");
      const state = Buffer.from(
        JSON.stringify({ tenantId, provider, ts, sig })
      ).toString("base64url");

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config.scopes.join(" "),
        state,
        access_type: "offline",
        prompt: "consent",
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;
      return NextResponse.json({ authUrl, state });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    captureException(error);
    log.error("[calendar/sync/connect] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
