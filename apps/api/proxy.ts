import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server";

const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health",
]);

export default clerkMiddleware(async (auth, req) => {
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
});

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
