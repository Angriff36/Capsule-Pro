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
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
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
