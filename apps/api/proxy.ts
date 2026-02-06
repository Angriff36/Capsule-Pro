import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server";

const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health",
]);

export default clerkMiddleware(async (auth, req) => {
  // If hitting the API directly from a browser without a session, 
  // we want to return a 401 JSON instead of a redirect loop.
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
