/**
 * Public Endpoint Rate Limiting
 *
 * IP-based rate limiting for public mutation endpoints that are exempt from
 * the global rate limiter. These endpoints don't require authentication, so
 * we rate limit by client IP instead of tenant/user identity.
 *
 * Limit: 10 requests per minute per IP per endpoint
 * Fail-open: if Redis is unavailable, requests are allowed through
 */

import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { NextResponse } from "next/server";

const publicLimiter = createRateLimiter({
  limiter: slidingWindow(10, "60 s"),
  prefix: "public_rate_limit",
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

/**
 * Checks whether the incoming request should be rate-limited.
 *
 * @returns A 429 NextResponse if rate limited, or null if the request is allowed.
 */
export async function checkPublicRateLimit(
  request: Request
): Promise<NextResponse | null> {
  try {
    const ip = getClientIp(request);
    const endpoint = getEndpointKey(request);
    const key = `${ip}:${endpoint}`;

    const result = await publicLimiter.limit(key);

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
