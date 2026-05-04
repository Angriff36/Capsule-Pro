import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { log } from "@repo/observability/log";

/**
 * GET /api/calendar/sync/callback/google
 *
 * OAuth 2.0 callback for Google Calendar.
 * Exchanges authorization code for tokens and stores them.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      log.error("[google/callback] OAuth error:", error);
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

    // Decode state
    let stateData: { tenantId: string; provider: string; ts: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    } catch {
      return NextResponse.redirect(
        new URL("/calendar/sync?error=invalid_state", request.url)
      );
    }

    const { tenantId } = stateData;

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.OAUTH_REDIRECT_URI}/api/calendar/sync/callback/google`;

    if (!(clientId && clientSecret)) {
      return NextResponse.redirect(
        new URL("/calendar/sync?error=oauth_not_configured", request.url)
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log.error("[google/callback] Token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL("/calendar/sync?error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info to store provider user ID
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    let providerUserId: string | undefined;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      providerUserId = userInfo.id;
    }

    // Get primary calendar info
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    let calendarId = "primary";
    let calendarName = "Primary Calendar";
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      calendarId = calendarData.id || "primary";
      calendarName = calendarData.summary || "Primary Calendar";
    }

    // Store tokens in database
    const { database } = await import("@/lib/database");

    await database.providerSync.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider: "google",
        },
      },
      create: {
        tenantId,
        provider: "google",
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
      new URL("/calendar/sync?connected=google", request.url)
    );
  } catch (error) {
    captureException(error);
    log.error("[google/callback] Error:", error);
    return NextResponse.redirect(
      new URL("/calendar/sync?error=callback_failed", request.url)
    );
  }
}
