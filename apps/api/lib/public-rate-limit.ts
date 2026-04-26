/**
 * Public Endpoint Rate Limiting
 *
 * IP-based rate limiting for unauthenticated endpoints that bypass the global
 * tenant/user-scoped limiter. Two profiles are exposed:
 *
 *  - `checkPublicRateLimit` — 10 requests / 60s. For human-driven public
 *    mutations (contract signing, proposal responses) where realistic traffic
 *    is at most a handful of submissions per minute per signer.
 *
 *  - `checkWebhookRateLimit` — 60 requests / 60s. For machine-driven webhook
 *    receivers (e.g. Resend email delivery callbacks) where legitimate bursts
 *    from a single source IP can exceed the human threshold but still need
 *    abuse protection beyond HMAC signature verification.
 *
 * Both fail open: if the rate limit store is unavailable, requests are
 * allowed through so a Redis outage cannot break legitimate flows.
 */

import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { NextResponse } from "next/server";

const publicLimiter = createRateLimiter({
  limiter: slidingWindow(10, "60 s"),
  prefix: "public_rate_limit",
});

const webhookLimiter = createRateLimiter({
  limiter: slidingWindow(60, "60 s"),
  prefix: "webhook_rate_limit",
});

/**
 * Extracts the client IP from proxy headers.
 * Supports x-forwarded-for (first IP in chain) and x-real-ip.
 */
function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Derives a stable rate-limit key for the endpoint.
 * Normalizes dynamic segments (UUIDs, long tokens) to ":id"
 * so they don't create separate rate limit buckets.
 */
const DYNAMIC_SEGMENT_RE = /^[0-9a-f]{8,}-/i;

function getEndpointKey(request: Request): string {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const normalized = pathParts
    .map((part) =>
      DYNAMIC_SEGMENT_RE.test(part) || part.length > 20 ? ":id" : part
    )
    .join("/");
  return `${request.method}:${normalized}`;
}

type Limiter = typeof publicLimiter;

async function applyLimit(
  request: Request,
  limiter: Limiter
): Promise<NextResponse | null> {
  try {
    const ip = getClientIp(request);
    const endpoint = getEndpointKey(request);
    const key = `${ip}:${endpoint}`;

    const result = await limiter.limit(key);

    if (!result.success) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": new Date(result.reset).toISOString(),
            "Retry-After": "60",
          },
        }
      );
    }

    return null; // Not rate limited
  } catch {
    // Fail open -- don't block requests if rate limiter is down
    return null;
  }
}

/**
 * Checks whether a public-mutation request should be rate-limited (10/min/IP).
 *
 * @returns A 429 NextResponse if rate limited, or null if the request is allowed.
 */
export function checkPublicRateLimit(
  request: Request
): Promise<NextResponse | null> {
  return applyLimit(request, publicLimiter);
}

/**
 * Checks whether a webhook receiver request should be rate-limited (60/min/IP).
 *
 * Webhook senders (Resend, Stripe, etc.) can legitimately deliver dozens of
 * events per minute from a single source IP for a busy tenant; the human
 * 10/min ceiling would drop legitimate events. Defense in depth still applies:
 * HMAC signature verification remains the primary auth, and this limiter
 * caps the impact of a leaked secret or a misbehaving sender.
 *
 * @returns A 429 NextResponse if rate limited, or null if the request is allowed.
 */
export function checkWebhookRateLimit(
  request: Request
): Promise<NextResponse | null> {
  return applyLimit(request, webhookLimiter);
}
