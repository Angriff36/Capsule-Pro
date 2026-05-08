import { captureException } from "@sentry/nextjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { log } from "@repo/observability/log";

/**
 * GET /api/calendar/sync/callback/outlook
 *
 * OAuth 2.0 callback for Microsoft/Outlook Calendar.
 * Exchanges authorization code for tokens and stores them.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      log.error("[outlook/callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/calendar/sync?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    if (!(code && state)) {
      return NextResponse.redirect(
        new URL("/calendar/sync?error=missing_code_or_state", request.url)
      );
    }

    // Decode and verify state (HMAC signature + expiry)
    let stateData: { tenantId: string; provider: string; ts: number; sig: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    } catch {
      return NextResponse.redirect(
        new URL("/calendar/sync?error=invalid_state", request.url)
      );
    }

    const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
    if (
      typeof stateData.ts !== "number" ||
      Date.now() - stateData.ts > STATE_MAX_AGE_MS
    ) {
      return NextResponse.redirect(
        new URL("/calendar/sync?error=expired_state", request.url)
      );
    }

    // Verify HMAC signature
    const secret = process.env.CALENDAR_SYNC_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
    const expectedSig = createHmac("sha256", secret)
      .update(JSON.stringify({ tenantId: stateData.tenantId, provider: stateData.provider, ts: stateData.ts }))
      .digest("hex");

    if (
      !stateData.sig ||
      !timingSafeEqual(Buffer.from(stateData.sig), Buffer.from(expectedSig))
    ) {
      return NextResponse.redirect(
        new URL("/calendar/sync?error=invalid_state_signature", request.url)
      );
    }

    const { tenantId } = stateData;

    // Exchange code for tokens
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${process.env.OAUTH_REDIRECT_URI}/api/calendar/sync/callback/outlook`;

    if (!(clientId && clientSecret)) {
      return NextResponse.redirect(
        new URL("/calendar/sync?error=oauth_not_configured", request.url)
      );
    }

    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log.error("[outlook/callback] Token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL("/calendar/sync?error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info to store provider user ID
    const userInfoResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    let providerUserId: string | undefined;
    let calendarName = "Primary Calendar";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      providerUserId = userInfo.id;
    }

    // Get default calendar info
    const calendarResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/calendar",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    let calendarId = "primary";
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      calendarId = calendarData.id || "primary";
      calendarName = calendarData.name || "Primary Calendar";
    }

    // Store tokens in database
    const { database } = await import("@/lib/database");

    await database.providerSync.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider: "outlook",
        },
      },
      create: {
        tenantId,
        provider: "outlook",
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiry: new Date(Date.now() + (expires_in || 3600) * 1000),
        providerUserId,
        calendarId,
        calendarName,
        status: "connected",
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiry: new Date(Date.now() + (expires_in || 3600) * 1000),
        providerUserId,
        calendarId,
        calendarName,
        status: "connected",
        lastSyncError: null,
        deletedAt: null,
      },
    });

    return NextResponse.redirect(
      new URL("/calendar/sync?connected=outlook", request.url)
    );
  } catch (error) {
    captureException(error);
    log.error("[outlook/callback] Error:", error);
    return NextResponse.redirect(
      new URL("/calendar/sync?error=callback_failed", request.url)
    );
  }
}
