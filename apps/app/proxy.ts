import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/plasmic(.*)",
  "/view/proposal(.*)",
  "/sign/contract(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/health(.*)",
  "/api/healthz(.*)",
  "/api/live(.*)",
  "/api/ready(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

function jsonResponse(message: string, status: number) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestOrigin(req: Request) {
  const url = new URL(req.url);

  // LAN IP over HTTP breaks Clerk — loopback only in dev.
  if (process.env.NODE_ENV === "development") {
    const port = url.port || "2226";
    if (
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1" &&
      !url.hostname.endsWith(".localhost")
    ) {
      return `http://127.0.0.1:${port}`;
    }
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return url.origin;
}

function redirectToSignIn(req: Request) {
  const currentUrl = new URL(req.url);
  const signInUrl = new URL("/sign-in", requestOrigin(req));
  signInUrl.searchParams.set(
    "redirect_url",
    `${requestOrigin(req)}${currentUrl.pathname}${currentUrl.search}`
  );
  return NextResponse.redirect(signInUrl, 307);
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req) || isPublicApiRoute(req)) {
    return;
  }

  if (isApiRoute(req)) {
    try {
      const { userId } = await auth();
      if (!userId) {
        return jsonResponse("Unauthorized", 401);
      }
    } catch (error) {
      captureException(error, {
        tags: { route: "app-middleware", errorType: "api_auth_failure" },
        extra: { url: req.url },
      });
      return jsonResponse("Forbidden", 403);
    }
    return;
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return redirectToSignIn(req);
    }
  } catch (error) {
    const isNextHttpError =
      error instanceof Error &&
      error.message?.startsWith("NEXT_HTTP_ERROR_FALLBACK;");
    if (!isNextHttpError) {
      captureException(error, {
        tags: { route: "app-middleware", errorType: "page_auth_failure" },
        extra: { url: req.url },
      });
    }
    return redirectToSignIn(req);
  }
});

export const config = {
  matcher: [
    /*
     * Run auth routing for every app/API request by default, while leaving
     * public routes, framework internals, and static files alone. This keeps
     * the same public allowlist as the route matchers above for clarity and
     * direct helper tests.
     */
    "/((?!(?:sign-in|sign-up|plasmic|view/proposal|sign/contract)(?:/|$)|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|site.webmanifest|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
