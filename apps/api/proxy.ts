import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server";
import type { NextMiddleware } from "next/server";
import { applyGlobalRateLimit, appendRateLimitHeaders } from "@/middleware/global-rate-limit";

const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health",
]);

const middleware: NextMiddleware = clerkMiddleware(async (auth, req) => {
  // If hitting the API directly from a browser without a session,
  // return a JSON 401 instead of redirect HTML.
  if (isPublicRoute(req)) {
    return;
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Global rate limiting — applied after authentication
  // Uses Upstash Redis sliding window (100 req/min per tenant+endpoint)
  // Per-route withRateLimit() still works for stricter limits on expensive ops
  const rateLimitResponse = await applyGlobalRateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Continue to the route handler.
  // For non-middleware-wrapped routes, the edge runtime can't append
  // rate limit headers to the upstream response, but the limit is still
  // enforced. Wrapped routes (withRateLimit) add their own headers.
  return;
});

export default middleware;

export const config = {
  // Narrow matcher to only API and tRPC routes
  // This prevents Clerk SDK from loading on public marketing pages
  matcher: [
    // Match all API routes
    "/api(.*)",
    // Match all tRPC routes
    "/trpc(.*)",
  ],
};
