import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/plasmic(.*)", // Public marketing pages
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

// Narrowed middleware matcher - only runs on protected routes
// Skips static files, public pages (Plasmic, sign-in, sign-up)
export const config = {
  matcher: [
    // Protected routes only - authenticated area, dev-console
    "/((authenticated|dev-console)(.*)|api(.*)|trpc(.*))",
    // Auth routes (need clerk middleware)
    "/sign-in(.*)",
    "/sign-up(.*)",
  ],
};
