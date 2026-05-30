import { withSentryConfig } from "@sentry/nextjs";
import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";

const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";

const baseConfig: NextConfig = withLogging({
  ...config,
  distDir,
  async headers() {
    const corsHeaders =
      process.env.NODE_ENV !== "production"
        ? [
            {
              key: "Access-Control-Allow-Origin",
              value: "http://127.0.0.1:2221",
            },
            {
              key: "Access-Control-Allow-Methods",
              value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
            },
            {
              key: "Access-Control-Allow-Headers",
              value: "Content-Type,Authorization,X-Requested-With",
            },
            { key: "Access-Control-Allow-Credentials", value: "true" },
          ]
        : [];

    const routes: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }> = [];

    // API CORS (dev only) — skip in production to avoid empty headers error
    if (corsHeaders.length > 0) {
      routes.push({
        source: "/api/:path*",
        headers: corsHeaders,
      });
    }

    // Security headers for all routes
    routes.push({
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin",
        },
        {
          key: "Cross-Origin-Resource-Policy",
          value: "same-origin",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        },
      ],
    });

    return routes;
  },
  // Fail build on TS errors; pnpm check:all also gates pre-push and CI.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Transpile workspace packages imported by API routes (not every @repo/* dep).
  transpilePackages: [
    "@angriff36/manifest",
    "@repo/auth",
    "@repo/database",
    "@repo/analytics",
    "@repo/observability",
    "@repo/security",
    "@repo/event-parser",
    "@repo/design-system",
    "@repo/email",
    "@repo/notifications",
    "@repo/payments",
    "@repo/rate-limit",
    "@repo/realtime",
    "@repo/sentry-integration",
  ],
  // Turbopack: resolve .js workspace imports to .ts sources
  turbopack: {
    ...config.turbopack,
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".wasm"],
  },
  experimental: {
    optimizePackageImports: ["date-fns"],
  },
  outputFileTracingIncludes: {
    "/*": [
      "../../manifest/source/**/*.manifest",
      "../../manifest/ir/**/*.json",
    ],
  },
  // pdfjs-dist / pdfkit: native assets and worker paths must stay in node_modules.
  serverExternalPackages: [
    "pdfjs-dist",
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    "pdfkit",
    "@repo/sales-reporting",
  ]
});

const withVercel = (config: NextConfig): NextConfig =>
  env.VERCEL ? withSentry(config) : config;
const withAnalyze = (config: NextConfig): NextConfig =>
  env.ANALYZE === "true" ? withAnalyzer(config) : config;

const nextConfig: NextConfig = withAnalyze(withVercel(baseConfig));

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "the-eight-percent",

  project: "capsule-pro-api",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Don't fail the deploy if source-map upload / release creation 403s
  // (e.g. SENTRY_AUTH_TOKEN missing release scope). Best-effort monitoring.
  errorHandler: (error) => {
    console.warn(
      `[sentry] build step failed (non-fatal): ${error.message}`
    );
  },

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
