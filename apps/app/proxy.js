Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const server_1 = require("@clerk/nextjs/server");
const isPublicRoute = (0, server_1.createRouteMatcher)(["/sign-in(.*)"]);
exports.default = (0, server_1.clerkMiddleware)(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});
exports.config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
