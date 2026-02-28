/**
 * Ably Token Auth endpoint — apps/app
 *
 * Docs relied on:
 *   - Ably Token Auth overview:
 *     https://ably.com/docs/auth/token
 *   - Ably createTokenRequest (REST SDK):
 *     https://ably.com/docs/api/rest-sdk/authentication#create-token-request
 *   - Ably TokenRequest object shape:
 *     https://ably.com/docs/api/rest-sdk/types#token-request
 *   - Next.js App Router Route Handlers:
 *     https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 *   - Clerk auth() helper (Next.js):
 *     https://clerk.com/docs/references/nextjs/auth
 *
 * Route: POST /ably/auth
 * Served by: capsule-pro-app.vercel.app (apps/app Next.js deployment)
 *
 * The frontend Ably clients use authUrl = "/ably/auth" (same-origin relative URL),
 * which resolves to this handler on the app deployment.
 *
 * IMPORTANT — env var required on Vercel (apps/app project):
 *   ABLY_API_KEY=<root-key or named-key from Ably dashboard>
 *   Format: "<AppID>.<KeyID>:<KeySecret>"
 *   Set at: Vercel Dashboard → capsule-pro-app project → Settings → Environment Variables
 */

import { auth } from "@repo/auth/server";
import Ably from "ably";
import { NextResponse } from "next/server";

// Force Node.js runtime — the Ably SDK uses Node.js APIs (crypto, https) that
// are not available on the Vercel Edge runtime.
// https://nextjs.org/docs/app/api-reference/file-conventions/route#runtime
export const runtime = "nodejs";

interface AuthRequest {
  tenantId: string;
}

const getClientId = (tenantId: string, userId: string) =>
  `tenant:${tenantId}:user:${userId}`;

export async function POST(request: Request) {
  try {
  // ── 1. Clerk authentication ──────────────────────────────────────────────
  // auth() throws if Clerk middleware is not configured; wrap defensively.
  let userId: string | null;
  let sessionClaims: Record<string, unknown> | null;

  try {
    const clerkAuth = await auth();
    userId = clerkAuth.userId;
    sessionClaims = clerkAuth.sessionClaims as Record<string, unknown> | null;
  } catch (err) {
    console.error("[ably/auth] Clerk auth() threw:", err);
    return NextResponse.json(
      { error: "Authentication service unavailable" },
      { status: 503 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Resolve tenantId ──────────────────────────────────────────────────
  // Prefer the body; fall back to the Clerk session claim injected by the
  // Clerk JWT template / custom claims.
  let requestBody: AuthRequest | null = null;
  try {
    requestBody = (await request.json()) as AuthRequest;
  } catch {
    // Body is optional — fall through to session-claim fallback.
  }

  const tenantId =
    requestBody?.tenantId ||
    (sessionClaims?.tenantId as string | undefined) ||
    null;

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required (body or session claim)" },
      { status: 400 }
    );
  }

  // ── 3. Validate env var ──────────────────────────────────────────────────
  // ABLY_API_KEY must be set in Vercel → capsule-pro-app → Environment Variables.
  // Format: "<AppID>.<KeyID>:<KeySecret>"  (the full root or named key string)
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.error(
      "[ably/auth] ABLY_API_KEY is not set. " +
        "Add it to Vercel → capsule-pro-app → Settings → Environment Variables."
    );
    return NextResponse.json(
      { error: "Ably is not configured on this server" },
      { status: 500 }
    );
  }

  // ── 4. Create Ably TokenRequest ──────────────────────────────────────────
  // We use Ably.Rest (server-side) to sign a TokenRequest that the client
  // can exchange directly with Ably's servers — the API key never leaves the
  // server.  See: https://ably.com/docs/auth/token#token-request
  //
  // clientId scopes the token to this specific tenant+user so Ably can
  // enforce per-client presence and capability rules.
  //
  // capability restricts the token to subscribe-only on the tenant channel.
  // Adjust the capability map if publish rights are needed for this client.
  const clientId = getClientId(tenantId, userId);
  const channel = `tenant:${tenantId}`;
  const ably = new Ably.Rest(apiKey);

  let tokenRequest: Ably.TokenRequest;
  try {
    tokenRequest = await ably.auth.createTokenRequest({
      clientId,
      capability: { [channel]: ["subscribe"] },
    });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;

    if (code === 40_160) {
      // 40160 = "capability is not a subset of key capability"
      // The named key's capability doesn't allow channel-specific scoping;
      // fall back to the key's own capability.
      // https://ably.com/docs/api/rest-sdk/authentication#create-token-request
      try {
        tokenRequest = await ably.auth.createTokenRequest({ clientId });
      } catch (fallbackErr) {
        console.error(
          "[ably/auth] createTokenRequest fallback failed:",
          fallbackErr
        );
        return NextResponse.json(
          { error: "Failed to create Ably token (fallback)" },
          { status: 500 }
        );
      }
    } else {
      // Any other Ably error (network, invalid key format, etc.)
      console.error("[ably/auth] createTokenRequest failed:", err);
      return NextResponse.json(
        { error: "Failed to create Ably token" },
        { status: 500 }
      );
    }
  }

  // ── 5. Return TokenRequest as JSON ───────────────────────────────────────
  // The Ably client SDK accepts a TokenRequest object directly from the
  // authCallback / authUrl response.
  // Shape: { keyName, ttl, timestamp, capability, clientId, nonce, mac }
  // https://ably.com/docs/api/rest-sdk/types#token-request
  return NextResponse.json(tokenRequest);
  } catch (outerErr) {
    console.error("[ably/auth] Unhandled error in POST handler:", outerErr);
    return NextResponse.json(
      { error: "Internal server error in ably/auth" },
      { status: 500 }
    );
  }
}
