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

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:2223"
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
  ];
};

let nextConfig: NextConfig = withToolbar(
  withLogging({
    ...config,
    distDir,
    // Build-time linting is handled by Biome in this repo.
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Type checking is handled by `pnpm tsc --noEmit` in CI.
    // Next.js's built-in type checker crashes on Vercel when lstat-ing
    // parenthesized route groups like (authenticated)/.
    typescript: {
      ignoreBuildErrors: true,
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
      // LAN/WiFi IP that appears in `next dev` output on multi-interface machines
      "10.2.231.104:2221",
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
    // Optimize production builds
    productionBrowserSourceMaps: false,
    redirects: async () => [
      {
        // Root of the authenticated layout used to be a server component that
        // called redirect("/command-board").  Vercel's build tracer expects a
        // page_client-reference-manifest.js for every page, but Next.js never
        // generates one for a pure server-component redirect — causing ENOENT
        // during "Collecting page data".  Moving the redirect here avoids
        // generating any page artifact at all.
        source: "/",
        destination: "/command-board",
        permanent: false,
      },
    ],
    rewrites,
    // Externalize pdfjs-dist, ably, and pdfkit to avoid bundling issues
    // ably: Turbopack + Ably causes keyv dynamic require failures in SSR
    // pdfkit: Needs access to .afm font files from node_modules
    serverExternalPackages: [
      "pdfjs-dist",
      "ably",
      "pdfkit",
      "vega",
      "vega-lite",
      "vega-embed",
      "vega-canvas",
      "@capsule-pro/sales-reporting",
      "@clerk/backend",
    ],
    webpack: (webpackConfig: WebpackConfig, context: WebpackContext) => {
      if (process.env.NODE_ENV === "production") {
        webpackConfig.cache = false;
      }

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

        // Externalize pdfjs-dist - use function to catch all nested imports
        const existingExternals = webpackConfig.externals || [];
        const pdfjsExternals = [
          (
            { request }: { request: string },
            callback: (err: null | Error, result?: string) => void
          ) => {
            // Externalize all pdfjs-dist imports
            if (
              request.startsWith("pdfjs-dist") ||
              request === "pdf.worker.mjs"
            ) {
              // Convert to commonjs reference
              const moduleName = request.startsWith("pdfjs-dist")
                ? request
                : "pdfjs-dist/build/pdf.worker.mjs";
              return callback(null, `commonjs ${moduleName}`);
            }
            // Continue to other externals
            return callback(null);
          },
        ];

        // Combine with existing externals.
        // NOTE: We intentionally do NOT externalize @repo/event-parser here.
        // Keeping it bundled avoids Node.js trying to require() an ESM-only package on Vercel.
        webpackConfig.externals = [
          ...(Array.isArray(existingExternals)
            ? existingExternals
            : [existingExternals]),
          ...pdfjsExternals,
        ];

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
