export { default } from "./proxy";

export const config = {
  matcher: [
    // Protected app pages only — explicit path-prefix matchers avoid matching
    // API rewrites (→ capsule-pro-api), static assets, metadata files,
    // and public routes (sign-in, sign-up, plasmic).
    "/accounting/:path*",
    "/administrative/:path*",
    "/analytics/:path*",
    "/calendar/:path*",
    "/command-board/:path*",
    "/contracts/:path*",
    "/crm/:path*",
    "/cycle-counting/:path*",
    "/data/:path*",
    "/dev-console/:path*",
    "/events/:path*",
    "/facilities/:path*",
    "/inventory/:path*",
    "/kitchen/:path*",
    "/knowledge-base/:path*",
    "/logistics/:path*",
    "/marketing/:path*",
    "/payroll/:path*",
    "/procurement/:path*",
    "/scheduling/:path*",
    "/search/:path*",
    "/settings/:path*",
    "/staff/:path*",
    "/staffing/:path*",
    "/tools/:path*",
    "/warehouse/:path*",
  ],
};
