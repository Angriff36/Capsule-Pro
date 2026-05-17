import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextMiddleware } from "next/server";
import { NextResponse } from "next/server";
import { applyGlobalRateLimit } from "@/middleware/global-rate-limit";

const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health(.*)",
  "/api/sentry-fixer/process",
  "/api/cron(.*)",
]);

const API_KEY_BEARER_PREFIX = "Bearer cp_";

const middleware: NextMiddleware = clerkMiddleware(async (auth, req) => {
  try {
    if (isPublicRoute(req)) {
      return;
    }

    // API key authentication path — bypass Clerk session check.
    // The route handler validates the key and enforces scope via
    // resolveCurrentUser() or getAuthContext().
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith(API_KEY_BEARER_PREFIX)) {
      // Derive a stable rate limit identity from the key prefix
      // so API-key requests are rate-limited at the global layer.
      const bearerToken = authHeader.slice("Bearer ".length);
      const keyPrefix = bearerToken.slice(0, 12);
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-api-key-id", keyPrefix);
      requestHeaders.set("x-api-path", req.nextUrl.pathname);
      requestHeaders.set("x-api-method", req.method);

      const rateLimitResponse = await applyGlobalRateLimit(
        new Request(req, { headers: requestHeaders })
      );
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Session (Clerk) authentication path
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rateLimitResponse = await applyGlobalRateLimit(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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
    // Return a safe 401 instead of letting unhandled auth errors surface as 500s
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Invalid or expired session",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

export default middleware;

export const config = {
  matcher: ["/api(.*)", "/trpc(.*)"],
};
