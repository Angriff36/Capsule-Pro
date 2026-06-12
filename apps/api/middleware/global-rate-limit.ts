/**
 * Global Rate Limiting Middleware
 *
 * Applied to all API routes via Next.js middleware (proxy.ts).
 * Uses the existing @repo/rate-limit package with Upstash Redis.
 *
 * Behavior:
 * - Runs after Clerk auth (needs tenant ID from session)
 * - Checks per-tenant config from database, falls back to defaults
 * - Returns 429 with standard rate limit headers when exceeded
 * - Adds x-ratelimit-* headers to all responses
 * - Fails closed on Redis errors (blocks request with 429) by default
 * - Routes in FAIL_OPEN_PATTERNS (health, webhooks) still pass through
 *
 * Individual routes can still use withRateLimit() for stricter limits.
 * The global layer provides baseline protection; per-route limits are
 * applied on top for expensive operations.
 */

import { log } from "@repo/observability/log";
import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { NextResponse } from "next/server";

// ============================================================================
// Constants
// ============================================================================

/** Default rate limit: 100 requests per minute per tenant+endpoint */
const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW = "1 m" as const;

/** Routes exempt from rate limiting */
const EXEMPT_PATTERNS = [
  /^\/webhooks\//, // External webhook receivers (Stripe, Clerk, etc.)
  /^\/api\/health/, // Health checks
  /^\/outbox\//, // Internal outbox
  /^\/api\/public\//, // Public-facing endpoints
];

/**
 * Routes that should fail-open (allow traffic) when Redis is down.
 * These are infrastructure routes where availability is more critical
 * than rate limiting. All other routes fail-closed on Redis errors.
 */
const FAIL_OPEN_PATTERNS = [
  /^\/api\/health/, // Health checks must always respond
  /^\/webhooks\//, // Webhook receivers must accept to avoid retry storms
];

// ============================================================================
// Rate Limiter Instances (created once, reused across requests)
// ============================================================================

/** Global default limiter — used when no tenant-specific config matches */
const defaultLimiter = createRateLimiter({
  limiter: slidingWindow(DEFAULT_LIMIT, DEFAULT_WINDOW),
  prefix: "global_rate_limit",
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a request path is exempt from rate limiting.
 */
function isExempt(pathname: string): boolean {
  return EXEMPT_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Normalizes a URL path for rate limit key generation.
 * Replaces UUIDs with :id to bucket dynamic routes together.
 */
function normalizeEndpoint(pathname: string, method: string): string {
  const normalized = pathname.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ":id"
  );
  return `${method}:${normalized}`;
}

/**
 * Extracts tenant identifier from request headers.
 * Set by Clerk middleware after session auth, or by proxy.ts after API key auth.
 */
function extractTenantKey(request: Request): string | null {
  // Clerk sets this after successful session auth
  const tenantId = request.headers.get("x-tenant-id");
  if (tenantId) {
    return `tenant:${tenantId}`;
  }

  // Fallback: use org ID if available
  const orgId = request.headers.get("x-org-id");
  if (orgId) {
    return `org:${orgId}`;
  }

  // Fallback: use user ID
  const userId = request.headers.get("x-user-id");
  if (userId) {
    return `user:${userId}`;
  }

  // API key identifier — set by proxy.ts after Bearer token detection
  const apiKeyId = request.headers.get("x-api-key-id");
  if (apiKeyId) {
    return `apikey:${apiKeyId}`;
  }

  // Anonymous: fall back to IP-based key
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  if (ip) {
    return `ip:${ip}`;
  }

  return null;
}

/**
 * Creates rate limit response headers.
 */
function _createRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: Date
): Headers {
  const headers = new Headers();
  headers.set("x-ratelimit-limit", String(limit));
  headers.set("x-ratelimit-remaining", String(Math.max(0, remaining)));
  headers.set("x-ratelimit-reset", reset.toISOString());
  return headers;
}

// ============================================================================
// Main Middleware Function
// ============================================================================

/**
 * Applies global rate limiting to a request.
 *
 * Call this after authentication in the middleware chain.
 * If rate limit is exceeded, returns a 429 response.
 * Otherwise, returns null and the request proceeds.
 *
 * @param request - The incoming Next.js request
 * @returns 429 Response if rate limited, or null to continue
 *
 * @example
 * // In proxy.ts middleware:
 * const rateLimitResponse = await applyGlobalRateLimit(request);
 * if (rateLimitResponse) return rateLimitResponse;
 * // ... continue with request
 */
export async function applyGlobalRateLimit(
  request: Request
): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip exempt routes
  if (isExempt(pathname)) {
    return null;
  }

  // Need a tenant/user identifier for rate limiting
  const tenantKey = extractTenantKey(request);
  if (!tenantKey) {
    // No auth context — let the request through
    // (auth middleware will handle 401 separately)
    return null;
  }

  const endpoint = normalizeEndpoint(pathname, request.method);
  const key = `${tenantKey}:${endpoint}`;

  try {
    const { success, remaining, reset } = await defaultLimiter.limit(key);
    const resetDate = new Date(reset);

    if (!success) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);
      const headers = new Headers();
      headers.set("x-ratelimit-limit", String(DEFAULT_LIMIT));
      headers.set("x-ratelimit-remaining", "0");
      headers.set("x-ratelimit-reset", resetDate.toISOString());
      headers.set("retry-after", String(retryAfter));

      return NextResponse.json(
        {
          message: "Too many requests. Please try again later.",
          limit: DEFAULT_LIMIT,
          remaining: 0,
          reset: resetDate.toISOString(),
        },
        { status: 429, headers }
      );
    }

    // Under limit — attach rate limit info via a header on the response
    // Note: Next.js middleware can't modify the upstream response directly,
    // so we store the values for the downstream handler to pick up.
    // The per-route withRateLimit HOF handles this for wrapped routes.
    // For unwrapped routes, the proxy middleware appends headers below.
    request.headers.set("x-ratelimit-applied", "true");
    request.headers.set("x-ratelimit-limit", String(DEFAULT_LIMIT));
    request.headers.set("x-ratelimit-remaining", String(remaining));
    request.headers.set("x-ratelimit-reset", resetDate.toISOString());

    return null;
  } catch (error) {
    // Check if this route is designated as fail-open
    const shouldFailOpen = FAIL_OPEN_PATTERNS.some((p) => p.test(pathname));

    if (shouldFailOpen) {
      log.error("[global-rate-limit] Redis error, fail-open allowing request", {
        pathname,
        error,
      });
      return null;
    }

    // Default: fail-closed — block traffic when Redis is unavailable
    log.error("[global-rate-limit] Redis error, fail-closed blocking request", {
      pathname,
      error,
    });
    const headers = new Headers();
    headers.set("retry-after", "60");

    return NextResponse.json(
      {
        message: "Service temporarily unavailable. Please try again later.",
      },
      { status: 429, headers }
    );
  }
}

/**
 * Appends rate limit headers to a response (if rate limiting was applied).
 * Call this on the response before returning from middleware.
 */
export function appendRateLimitHeaders(
  response: Response,
  request: Request
): Response {
  const applied = request.headers.get("x-ratelimit-applied");
  if (applied !== "true") {
    return response;
  }

  const limit = request.headers.get("x-ratelimit-limit");
  const remaining = request.headers.get("x-ratelimit-remaining");
  const reset = request.headers.get("x-ratelimit-reset");

  if (limit && remaining && reset) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set("x-ratelimit-limit", limit);
    newHeaders.set("x-ratelimit-remaining", remaining);
    newHeaders.set("x-ratelimit-reset", reset);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return response;
}
