import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextMiddleware } from "next/server";
import { applyGlobalRateLimit } from "@/middleware/global-rate-limit";

const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health(.*)",
  "/api/sentry-fixer/process",
]);

const middleware: NextMiddleware = clerkMiddleware(async (auth, req) => {
  try {
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
  } catch (error) {
    captureException(
      error instanceof Error
        ? error
        : new Error(`API middleware auth failure: ${String(error)}`),
      {
        tags: { source: "api-middleware", route: req.nextUrl.pathname },
      }
    );
    // Let Next.js handle the error rather than silently swallowing
    throw error;
  }
});

export default middleware;

export const config = {
  matcher: ["/api(.*)", "/trpc(.*)"],
};
