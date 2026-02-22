import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/plasmic(.*)", // Public marketing pages
]);
const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  // For programmatic API calls, return JSON 401 instead of Clerk rewrite HTML.
  if (isApiRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return;
  }

  await auth.protect();
});

// Narrowed middleware matcher - only runs on protected routes
// Skips static files, public pages (Plasmic, sign-in, sign-up)
export const config = {
  matcher: [
    // Run middleware for all app routes except static assets
    "/((?!_next|.*\\..*).*)",
    // Keep explicit API/trpc coverage for programmatic auth handling
    "/(api|trpc)(.*)",
  ],
};
