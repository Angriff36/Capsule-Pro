import "server-only";

import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { rateLimitService } from "./rate-limiting";

/**
 * Rate limiting middleware for API routes.
 *
 * This middleware should be applied to all API routes to enforce
 * per-tenant rate limits based on configured policies.
 *
 * Returns a Response if rate limit is exceeded, otherwise returns null.
 */
export async function rateLimitMiddleware(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // Skip rate limiting for health checks and webhooks
  const skipPaths = ["/api/health", "/webhooks", "/outbox"];
  if (skipPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  // Skip rate limiting if not authenticated (auth middleware will handle it)
  const { userId } = await auth();
  if (!userId) {
    return null; // Let auth middleware handle unauthorized requests
  }

  try {
    // Check rate limit
    const check = await rateLimitService.checkRateLimit(
      pathname,
      method,
      userId
    );

    // Record the event asynchronously
    rateLimitService
      .recordEvent(pathname, method, check, userId)
      .catch((err) => {
        console.error("[RateLimitMiddleware] Failed to record event:", err);
      });

    if (!check.allowed) {
      // Return 429 Too Many Requests
      return new NextResponse(
        JSON.stringify({
          message: "Rate limit exceeded",
          retryAfter: check.retryAfter,
        }),
        {
          status: 429,
          statusText: "Too Many Requests",
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(check.retryAfter ?? 60),
            "X-RateLimit-Limit": String(check.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": check.resetAt.toISOString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    // We need to attach these to the response somehow
    // For Next.js route handlers, we can't modify the response here
    // Instead, we'll store the check result for the route handler to use
    return null;
  } catch (error) {
    // If rate limiting fails, log the error but allow the request
    console.error("[RateLimitMiddleware] Rate limit check failed:", error);
    return null; // Fail open - don't block requests on rate limiter errors
  }
}

/**
 * Add rate limit headers to a response
 *
 * This should be called by route handlers to add rate limit headers
 * to their responses.
 */
export function addRateLimitHeaders(
  response: Response,
  check: { limit: number; remaining: number; resetAt: Date }
): Response {
  response.headers.set("X-RateLimit-Limit", String(check.limit));
  response.headers.set("X-RateLimit-Remaining", String(check.remaining));
  response.headers.set("X-RateLimit-Reset", check.resetAt.toISOString());

  return response;
}
