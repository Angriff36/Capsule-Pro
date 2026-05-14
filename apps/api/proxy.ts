import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextMiddleware } from "next/server";
import { NextResponse } from "next/server";
import { applyGlobalRateLimit } from "@/middleware/global-rate-limit";

const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health(.*)",
]);

const API_KEY_BEARER_PREFIX = "Bearer cp_";

const middleware: NextMiddleware = clerkMiddleware(async (auth, req) => {
  try {
    if (isPublicRoute(req)) {
      return;
    }

    // Vercel Cron jobs carry x-vercel-cron header — allow through.
    // The route handler performs its own authentication.
    const vercelCronHeader = req.headers.get("x-vercel-cron");
    if (vercelCronHeader === "1" || vercelCronHeader === "true") {
      return;
    }

    // API key authentication path — bypass Clerk session check.
    // The route handler validates the key and enforces scope via
    // resolveCurrentUser() or getAuthContext().
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith(API_KEY_BEARER_PREFIX)) {
      const rateLimitResponse = await applyGlobalRateLimit(req);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
      // Pass the request path to route handlers via header so
      // scope enforcement can map the route to a required scope.
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-api-path", req.nextUrl.pathname);
      requestHeaders.set("x-api-method", req.method);
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
