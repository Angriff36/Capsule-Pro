/**
 * Ably Token Auth endpoint — apps/api
 *
 * Docs relied on:
 *   - Ably Token Auth overview:
 *     https://ably.com/docs/auth/token
 *   - Ably createTokenRequest (REST SDK):
 *     https://ably.com/docs/api/rest-sdk/authentication#create-token-request
 *   - Ably TokenRequest object shape:
 *     https://ably.com/docs/api/rest-sdk/types#token-request
 *   - Ably capability strings:
 *     https://ably.com/docs/auth/capabilities
 *   - Next.js App Router Route Handlers:
 *     https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 *   - Clerk auth() helper (Next.js):
 *     https://clerk.com/docs/references/nextjs/auth
 *
 * Route: POST /ably/auth
 * Served by: capsule-pro-api.vercel.app (apps/api Next.js deployment)
 *
 * This is the canonical Ably token auth handler for the API app.
 * It includes CORS support so the apps/app frontend can call it cross-origin
 * if needed (controlled via ABLY_AUTH_CORS_ORIGINS env var).
 *
 * IMPORTANT — env vars required on Vercel (apps/api project):
 *   ABLY_API_KEY=<root-key or named-key from Ably dashboard>
 *     Format: "<AppID>.<KeyID>:<KeySecret>"
 *     Set at: Vercel Dashboard → capsule-pro-api project → Settings → Environment Variables
 *
 *   ABLY_AUTH_CORS_ORIGINS=https://capsule-pro-app.vercel.app,https://your-custom-domain.com
 *     (comma-separated; optional — defaults to localhost dev ports)
 *     Set at: Vercel Dashboard → capsule-pro-api project → Settings → Environment Variables
 */

import { auth } from "@repo/auth/server";
import Ably from "ably";
import { NextResponse } from "next/server";
import { env } from "@/env";

// Force Node.js runtime — the Ably SDK uses Node.js APIs (crypto, https) that
// are not available on the Vercel Edge runtime.
// https://nextjs.org/docs/app/api-reference/file-conventions/route#runtime
export const runtime = "nodejs";

interface AuthRequest {
  tenantId: string;
}

const getClientId = (tenantId: string, userId: string) =>
  `tenant:${tenantId}:user:${userId}`;

// Get allowed origins from environment or default to common dev ports.
// Set ABLY_AUTH_CORS_ORIGINS on Vercel to include your production app domain.
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = env.ABLY_AUTH_CORS_ORIGINS?.split(",").map(
    (o: string) => o.trim()
  );
  return (
    allowedOrigins || [
      "http://localhost:2221",
      "http://localhost:2222",
      "http://localhost:3000",
      "http://127.0.0.1:2221",
      "http://127.0.0.1:2222",
      "http://127.0.0.1:3000",
    ]
  );
};

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  // Reflect the request origin if it is in the allowlist; otherwise use the
  // first configured origin as a safe fallback.
  const allowedOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin ?? "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // credentials: "include" is required on the client side when Clerk session
    // cookies must be forwarded for cross-origin auth.
    "Access-Control-Allow-Credentials": "true",
  };
}

// Handle CORS preflight requests.
export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: Request) {
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
      { status: 503, headers: corsHeaders(request) }
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders(request) }
    );
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
      { status: 400, headers: corsHeaders(request) }
    );
  }

  // ── 3. Create Ably TokenRequest ──────────────────────────────────────────
  // env.ABLY_API_KEY is validated at startup by @t3-oss/env-nextjs + Zod
  // (see apps/api/env.ts). If it is missing the app will fail to start, so
  // we do not need a runtime null-check here — but we still wrap the Ably
  // call to return a structured JSON error instead of an unhandled 500.
  //
  // clientId scopes the token to this specific tenant+user so Ably can
  // enforce per-client presence and capability rules.
  //
  // capability restricts the token to subscribe-only on the tenant channel.
  // Adjust the capability map if publish rights are needed for this client.
  //
  // https://ably.com/docs/auth/token#token-request
  // https://ably.com/docs/auth/capabilities
  const clientId = getClientId(tenantId, userId);
  const channel = `tenant:${tenantId}`;
  const ably = new Ably.Rest(env.ABLY_API_KEY);

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
          { status: 500, headers: corsHeaders(request) }
        );
      }
    } else {
      // Any other Ably error (network, invalid key format, etc.)
      console.error("[ably/auth] createTokenRequest failed:", err);
      return NextResponse.json(
        { error: "Failed to create Ably token" },
        { status: 500, headers: corsHeaders(request) }
      );
    }
  }

  // ── 4. Return TokenRequest as JSON ───────────────────────────────────────
  // The Ably client SDK accepts a TokenRequest object directly from the
  // authCallback / authUrl response.
  // Shape: { keyName, ttl, timestamp, capability, clientId, nonce, mac }
  // https://ably.com/docs/api/rest-sdk/types#token-request
  return NextResponse.json(tokenRequest, {
    headers: corsHeaders(request),
  });
}
