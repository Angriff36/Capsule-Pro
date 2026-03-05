import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { rateLimitService } from "./rate-limiting";

/**
 * Rate limit wrapper for Next.js route handlers.
 *
 * Usage in route.ts files:
 *
 * import { withRateLimit } from "@/app/lib/rate-limit-helper";
 *
 * export const GET = withRateLimit(async (req) => {
 *   // Your handler code here
 *   return NextResponse.json({ data });
 * });
 */
export function withRateLimit<T extends NextRequest = NextRequest>(
  handler: (req: T) => Promise<Response> | Response,
  options?: {
    // Override endpoint for rate limiting (defaults to req.url pathname)
    endpoint?: string;
    // Skip rate limiting for this request
    skipRateLimit?: boolean;
  }
): (req: T) => Promise<Response> {
  return async (req: T) => {
    const url = new URL(req.url);
    const pathname = options?.endpoint ?? url.pathname;
    const method = req.method;

    // Check rate limit
    const check = options?.skipRateLimit
      ? { allowed: true, limit: 0, remaining: -1, resetAt: new Date() }
      : await rateLimitService.checkRateLimit(pathname, method);

    // Record event asynchronously
    rateLimitService.recordEvent(pathname, method, check).catch((err) => {
      console.error("[withRateLimit] Failed to record event:", err);
    });

    if (!check.allowed) {
      // Return 429 Too Many Requests
      return NextResponse.json(
        {
          message: "Rate limit exceeded",
          retryAfter: check.retryAfter,
        },
        {
          status: 429,
          statusText: "Too Many Requests",
          headers: {
            "Retry-After": String(check.retryAfter ?? 60),
            "X-RateLimit-Limit": String(check.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": check.resetAt.toISOString(),
          },
        }
      );
    }

    // Call the handler
    const response = await handler(req);

    // Add rate limit headers to the response
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-RateLimit-Limit", String(check.limit));
    responseHeaders.set("X-RateLimit-Remaining", String(check.remaining));
    responseHeaders.set("X-RateLimit-Reset", check.resetAt.toISOString());

    // Return a new response with the headers
    // For NextResponse, we can clone and modify headers
    if (response instanceof NextResponse) {
      response.headers.set("X-RateLimit-Limit", String(check.limit));
      response.headers.set("X-RateLimit-Remaining", String(check.remaining));
      response.headers.set("X-RateLimit-Reset", check.resetAt.toISOString());
      return response;
    }

    // For Response objects, create a new one with modified headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  };
}

/**
 * Decorator to add rate limit headers to an existing response
 *
 * Use this when you can't use withRateLimit wrapper:
 *
 * export async function GET(req: NextRequest) {
 *   const check = await getRateLimitCheck(req);
 *   // ... your logic ...
 *   return addRateLimitHeaders(NextResponse.json({}), check);
 * }
 */
export async function getRateLimitCheck(req: NextRequest, endpoint?: string) {
  const url = new URL(req.url);
  const pathname = endpoint ?? url.pathname;
  const method = req.method;

  return rateLimitService.checkRateLimit(pathname, method);
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  check: { limit: number; remaining: number; resetAt: Date }
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(check.limit));
  response.headers.set("X-RateLimit-Remaining", String(check.remaining));
  response.headers.set("X-RateLimit-Reset", check.resetAt.toISOString());

  return response;
}
