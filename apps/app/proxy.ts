import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/plasmic(.*)", // Public marketing pages
]);
const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

/** Cookie-based auth redirect loop detection */
const LOOP_COOKIE = "x-auth-loop";
const LOOP_THRESHOLD = 5;
const LOOP_WINDOW_MS = 60_000;

function detectAuthLoop(req: NextRequest): {
  isLoop: boolean;
  response?: NextResponse;
} {
  const raw = req.cookies.get(LOOP_COOKIE)?.value;
  const now = Date.now();
  let count = 0;
  let windowStart = now;

  if (raw) {
    const [c, t] = raw.split("|").map(Number);
    if (now - t < LOOP_WINDOW_MS) {
      count = c;
      windowStart = t;
    }
  }

  count++;

  if (count >= LOOP_THRESHOLD) {
    captureException(new Error("Clerk auth redirect loop detected"), {
      tags: { route: "app-middleware", errorType: "auth_loop" },
      extra: { url: req.url, count, windowMs: now - windowStart },
    });
    const res = NextResponse.redirect(new URL("/sign-in", req.url));
    res.cookies.delete(LOOP_COOKIE);
    return { isLoop: true, response: res };
  }

  return { isLoop: false };
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  // For programmatic API calls, return JSON 401 instead of Clerk rewrite HTML.
  if (isApiRoute(req)) {
    try {
      const { userId } = await auth();
      if (!userId) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      captureException(error, {
        tags: { route: "app-middleware", errorType: "api_auth_failure" },
        extra: { url: req.url },
      });
      return new Response(JSON.stringify({ message: "Auth error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return;
  }

  try {
    // Detect auth redirect loops before calling protect()
    const loop = detectAuthLoop(req as NextRequest);
    if (loop.isLoop && loop.response) {
      return loop.response;
    }

    await auth.protect();
  } catch (error) {
    // Filter out Next.js HTTP error fallbacks (404s, etc.) — not real errors
    const isNextHttpError =
      error instanceof Error &&
      error.message?.startsWith("NEXT_HTTP_ERROR_FALLBACK;");
    if (!isNextHttpError) {
      captureException(error, {
        tags: { route: "app-middleware", errorType: "protect_failure" },
        extra: { url: req.url },
      });
    }
    throw error;
  }
});
