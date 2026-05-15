import { withToolbar } from "@repo/feature-flags/lib/toolbar";
import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "./env";

const OPENTELEMETRY_EXCLUDE = /@opentelemetry/;
const SENTRY_EXCLUDE = /@sentry/;
const CRITICAL_DEPENDENCY_WARNING =
  /Critical dependency: the request of a dependency is an expression/;
const PACK_FILE_CACHE_WARNING =
  /Serializing big strings .* impacts deserialization performance/;

/**
 * Resolve the API base URL for rewrites.
 *
 * Priority:
 * 1. NEXT_PUBLIC_API_URL — explicit env var (production .env or Vercel env setting)
 * 2. VERCEL_API_URL — set in Vercel project settings to point to the API project's URL
 *    (e.g., "capsule-pro-api-git-feat-xyz.vercel.app" for preview, "capsule-pro-api.vercel.app" for prod)
 * 3. localhost fallback for local development
 */
const apiBaseUrl = (
  process.env.NODE_ENV !== "production" && !process.env.VERCEL
    ? "http://127.0.0.1:2223"
    : process.env.NEXT_PUBLIC_API_URL ||
      process.env.VERCEL_API_URL ||
      (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development"
        ? "https://capsule-pro-api.vercel.app"
        : null) ||
      "http://127.0.0.1:2223"
).replace(/\/$/, "");
const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";

type WebpackConfig = Parameters<NonNullable<NextConfig["webpack"]>>[0];
type WebpackContext = Parameters<NonNullable<NextConfig["webpack"]>>[1];

const rewrites: NextConfig["rewrites"] = async () => {
  const baseRewritesResult =
    typeof config.rewrites === "function" ? await config.rewrites() : [];
  const baseRewrites = Array.isArray(baseRewritesResult)
    ? baseRewritesResult
    : [
        ...(baseRewritesResult.beforeFiles ?? []),
        ...(baseRewritesResult.afterFiles ?? []),
        ...(baseRewritesResult.fallback ?? []),
      ];

  return [
    ...baseRewrites,
    {
      source: "/api/kitchen/:path*",
      destination: `${apiBaseUrl}/api/kitchen/:path*`,
    },
    {
      source: "/api/inventory/:path*",
      destination: `${apiBaseUrl}/api/inventory/:path*`,
    },
    {
      source: "/api/analytics/:path*",
      destination: `${apiBaseUrl}/api/analytics/:path*`,
    },
    {
      source: "/api/shipments/:path*",
      destination: `${apiBaseUrl}/api/shipments/:path*`,
    },
    {
      source: "/api/events/:path*",
      destination: `${apiBaseUrl}/api/events/:path*`,
    },
    {
      source: "/api/administrative/:path*",
      destination: `${apiBaseUrl}/api/administrative/:path*`,
    },
    {
      source: "/api/staff/:path*",
      destination: `${apiBaseUrl}/api/staff/:path*`,
    },
    {
      source: "/api/locations/:path*",
      destination: `${apiBaseUrl}/api/locations/:path*`,
    },
    {
      source: "/api/ai/:path*",
      destination: `${apiBaseUrl}/api/ai/:path*`,
    },
    {
      source: "/api/crm/:path*",
      destination: `${apiBaseUrl}/api/crm/:path*`,
    },
    {
      source: "/api/payroll/:path*",
      destination: `${apiBaseUrl}/api/payroll/:path*`,
    },
    {
      source: "/api/timecards/:path*",
      destination: `${apiBaseUrl}/api/timecards/:path*`,
    },
    {
      source: "/api/collaboration/:path*",
      destination: `${apiBaseUrl}/api/collaboration/:path*`,
    },
    {
      source: "/api/command-board/:path*",
      destination: `${apiBaseUrl}/api/command-board/:path*`,
    },
    {
      source: "/api/conflicts/:path*",
      destination: `${apiBaseUrl}/api/conflicts/:path*`,
    },
    {
      source: "/api/accounting/:path*",
      destination: `${apiBaseUrl}/api/accounting/:path*`,
    },
    {
      source: "/api/facilities/:path*",
      destination: `${apiBaseUrl}/api/facilities/:path*`,
    },
    {
      source: "/api/training/:path*",
      destination: `${apiBaseUrl}/api/training/:path*`,
    },
    {
      source: "/api/staffing/:path*",
      destination: `${apiBaseUrl}/api/staffing/:path*`,
    },
    {
      source: "/api/logistics/:path*",
      destination: `${apiBaseUrl}/api/logistics/:path*`,
    },
    {
      source: "/api/procurement/:path*",
      destination: `${apiBaseUrl}/api/procurement/:path*`,
    },
    {
      source: "/api/activity-feed/:path*",
      destination: `${apiBaseUrl}/api/activity-feed/:path*`,
    },
    {
      source: "/api/knowledge-base/:path*",
      destination: `${apiBaseUrl}/api/knowledge-base/:path*`,
    },
    {
      source: "/api/calendar/:path*",
      destination: `${apiBaseUrl}/api/calendar/:path*`,
    },
    {
      source: "/api/workorder/:path*",
      destination: `${apiBaseUrl}/api/workorder/:path*`,
    },
    {
      source: "/api/user/:path*",
      destination: `${apiBaseUrl}/api/user/:path*`,
    },
    {
      source: "/api/integrations/:path*",
      destination: `${apiBaseUrl}/api/integrations/:path*`,
    },
    {
      source: "/api/communications/:path*",
      destination: `${apiBaseUrl}/api/communications/:path*`,
    },
    {
      source: "/api/settings/:path*",
      destination: `${apiBaseUrl}/api/settings/:path*`,
    },
    {
      source: "/api/rolepolicy/:path*",
      destination: `${apiBaseUrl}/api/rolepolicy/:path*`,
    },
    {
      source: "/api/search/:path*",
      destination: `${apiBaseUrl}/api/search/:path*`,
    },
  ];
};

let nextConfig: NextConfig = withToolbar(
  withLogging({
    ...config,
    distDir,
    // Enable version skew protection on Vercel.
    // Framework-managed requests (Next.js Link, router) get ?dpl= and x-deployment-id
    // automatically. Custom fetch() calls (e.g., agent-loop, tool-registry) also need it
    // but require manual passing — see getApiBaseUrl() in app/lib/api.ts.
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    // Build-time linting is handled by Biome in this repo.
    eslint: {
      // Linting is handled by Biome in CI and pre-commit.
      // Next.js eslint runs during build — we gate on Biome instead.
      ignoreDuringBuilds: true,
    },
    // Transpile workspace packages and heavy libraries for better performance
    transpilePackages: [
      "@repo/design-system",
      "@repo/auth",
      "@repo/database",
      "@repo/analytics",
      "@repo/observability",
      "@repo/security",
      "@repo/feature-flags",
      "@repo/event-parser",
      "@repo/webhooks",
      "@repo/notifications",
      "@repo/collaboration",
      "@angriff36/manifest",
      "@repo/manifest-adapters",
      "@repo/seo",
    ],
    // Allow cross-origin requests to the Next.js dev server from:
    //   - The app itself on its own port (2221) — needed when the browser
    //     resolves the host as 127.0.0.1 or the LAN IP instead of localhost.
    //   - The API server (2223) — server actions and tool-registry fetch from it.
    //   - The Vercel Toolbar companion (25002).
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
    allowedDevOrigins: [
      // App port — covers browser → Next dev server cross-origin warnings
      "localhost:2221",
      "127.0.0.1:2221",
      // API server — server actions call it directly in dev
      "localhost:2223",
      "127.0.0.1:2223",
      // Vercel Toolbar companion
      "localhost:25002",
      "127.0.0.1:25002",
    ],
    experimental: {
      optimizePackageImports: [
        "lucide-react",
        "date-fns",
        "recharts",
        "@repo/design-system",
      ],
      // Reduce server action bundle size
      serverActions: {
        bodySizeLimit: "2mb",
      },
    },
    // Enable source maps only when they can be uploaded to Sentry.
    // Local builds and non-Vercel deploys skip this to save build time.
    // Source maps are deleted after upload to Sentry.
    productionBrowserSourceMaps:
      env.VERCEL && Boolean(process.env.SENTRY_AUTH_TOKEN),
    redirects: async () => [
      {
        // Legacy route — moved to /scheduling/availability
        source: "/staff/availability",
        destination: "/scheduling/availability",
        permanent: false,
      },
      // Calendar module orphans (sidebar links elsewhere, but direct URLs were 404)
      {
        source: "/calendar/add-event",
        destination: "/events/new",
        permanent: false,
      },
      {
        source: "/calendar/schedule-shift",
        destination: "/scheduling/shifts/new",
        permanent: false,
      },
      {
        source: "/calendar/webhooks",
        destination: "/webhooks",
        permanent: false,
      },
      // Events module orphans
      {
        source: "/events/imports",
        destination: "/events",
        permanent: false,
      },
      {
        source: "/events/settings",
        destination: "/events",
        permanent: false,
      },
      {
        source: "/events/webhooks",
        destination: "/webhooks",
        permanent: false,
      },
      // Orphan routes — sidebar links but no page.tsx
      {
        source: "/staffing/coverage",
        destination: "/staffing",
        permanent: false,
      },
    ],
    rewrites,
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.com https://*.clerk.accounts.dev https://us-assets.i.posthog.com https://www.googletagmanager.com blob:",
                "worker-src 'self' blob:",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: blob: https://img.clerk.com",
                "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ably.io https://*.ably-realtime.com https://*.ably.net",
                "frame-ancestors 'none'",
                "frame-src 'self' https://*.clerk.accounts.dev",
                "base-uri 'self'",
                "form-action 'self'",
              ].join("; "),
            },
          ],
        },
      ];
    },
    // Externalize ably and pdfkit to avoid bundling issues
    // ably: Turbopack + Ably causes keyv dynamic require failures in SSR
    // pdfkit: Needs access to .afm font files from node_modules
    serverExternalPackages: [
      "@prisma/adapter-neon",
      "ably",
      "pdfkit",
      "vega-lite",
      "@capsule-pro/sales-reporting",
      "@clerk/backend",
    ],
    // Include manifest file in Vercel deployments for command-board chat
    outputFileTracingIncludes: {
      "/*": ["../../packages/manifest-ir/dist/routes.manifest.json"],
    },
    webpack: (webpackConfig: WebpackConfig, context: WebpackContext) => {
      // Production optimizations to reduce bundle size and build time
      if (context.isServer && context.nextRuntime === "nodejs") {
        webpackConfig.resolve = webpackConfig.resolve ?? {};
        webpackConfig.resolve.alias = {
          ...(webpackConfig.resolve.alias ?? {}),
          canvas: false,
        };

        // Increase memory limit for production builds
        if (process.env.NODE_ENV === "production") {
          webpackConfig.optimization = {
            ...webpackConfig.optimization,
            moduleIds: "deterministic",
            minimize: true,
          };
        }

        // Suppress 'Critical dependency' and large string warnings that bloat logs/context
        webpackConfig.ignoreWarnings = [
          ...(webpackConfig.ignoreWarnings || []),
          { module: OPENTELEMETRY_EXCLUDE },
          { module: SENTRY_EXCLUDE },
          {
            message: CRITICAL_DEPENDENCY_WARNING,
          },
          {
            message: PACK_FILE_CACHE_WARNING,
          },
        ];
      }
      return webpackConfig;
    },
  })
);

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
