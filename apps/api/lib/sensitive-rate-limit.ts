/**
 * Sensitive Tenant Operation Rate Limiting
 *
 * Tighter, tenant-scoped rate limiting for high-risk authenticated mutations
 * (payment processing, refunds, etc.) that already pass the global per-tenant
 * 100/min limiter in `middleware/global-rate-limit.ts`.
 *
 * Why this exists:
 *   - The global limiter caps total per-tenant traffic but is too permissive
 *     for individual sensitive endpoints. A leaked session or compromised user
 *     could fire 100 refund attempts per minute under the global cap alone.
 *   - This helper adds a per-tenant + per-endpoint ceiling specifically for
 *     financial mutations. Default cap is 20/minute — well above any
 *     legitimate human workflow but low enough to bound abuse blast radius.
 *
 * Behavior:
 *   - Keyed by `tenantId:endpoint` so process and refund have independent
 *     buckets. A tenant burning their refund quota does not block GETs.
 *   - Fails open: if Redis is unavailable, requests proceed. Mirrors the
 *     pattern in `public-rate-limit.ts` and `global-rate-limit.ts` so a Redis
 *     outage cannot wedge all financial flows.
 *   - Returns 429 with standard `X-RateLimit-*` + `Retry-After` headers when
 *     exceeded.
 */

import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { NextResponse } from "next/server";

const sensitiveLimiter = createRateLimiter({
  limiter: slidingWindow(20, "60 s"),
  prefix: "sensitive_tenant_rate_limit",
});

/**
 * Derives a stable rate-limit key for the endpoint.
 * Normalizes UUID and long dynamic segments to ":id" so individual resource
 * IDs do not create separate rate-limit buckets per id.
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
 * Checks whether a sensitive tenant-scoped mutation should be rate-limited.
 * Default cap: 20 requests / 60s per (tenantId, endpoint) pair.
 *
 * Call this AFTER `requireTenantId()` so the caller is already authenticated
 * and the tenant ID has been validated.
 *
 * @returns A 429 NextResponse if rate limited, or null if the request is allowed.
 */
export async function checkSensitiveTenantRateLimit(
  request: Request,
  tenantId: string
): Promise<NextResponse | null> {
  try {
    const endpoint = getEndpointKey(request);
    const key = `${tenantId}:${endpoint}`;

    const result = await sensitiveLimiter.limit(key);

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

    return null;
  } catch {
    // Fail open -- don't block legitimate financial flows on Redis outage.
    return null;
  }
}
