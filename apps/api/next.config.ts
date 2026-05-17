import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";

type WebpackConfig = Parameters<NonNullable<NextConfig["webpack"]>>[0];
type WebpackContext = Parameters<NonNullable<NextConfig["webpack"]>>[1];

const OPENTELEMETRY_EXCLUDE = /@opentelemetry/;
const SENTRY_EXCLUDE = /@sentry/;
const CRITICAL_DEPENDENCY_WARNING =
  /Critical dependency: the request of a dependency is an expression/;
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
    "@repo/manifest-adapters",
    "@repo/supplier-connectors",
    "@repo/design-system",
    "@repo/email",
    "@repo/notifications",
    "@repo/payments",
    "@repo/rate-limit",
    "@repo/realtime",
    "@repo/sentry-integration",
  ],
  experimental: {
    optimizePackageImports: ["date-fns"],
  },
  outputFileTracingIncludes: {
    "/*": [
      "../../packages/manifest-adapters/manifests/**/*.manifest",
      "../../packages/manifest-ir/ir/**/*.json",
    ],
  },
  // pdfjs-dist / pdfkit: native assets and worker paths must stay in node_modules.
  // ably: SSR bundling hits keyv/got dynamic-require issues if not externalized.
  serverExternalPackages: [
    "pdfjs-dist",
    "ably",
    "pdfkit",
    "@repo/sales-reporting",
  ],
  webpack: (webpackConfig: WebpackConfig, { isServer }: WebpackContext) => {
    if (isServer) {
      const pdfjsExternal = "pdfjs-dist/legacy/build/pdf.worker.mjs";
      const existingExternals = webpackConfig.externals;

      if (Array.isArray(existingExternals)) {
        webpackConfig.externals = [...existingExternals, pdfjsExternal];
      } else if (existingExternals) {
        webpackConfig.externals = [existingExternals, pdfjsExternal];
      } else {
        webpackConfig.externals = [pdfjsExternal];
      }

      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        { module: OPENTELEMETRY_EXCLUDE },
        { module: SENTRY_EXCLUDE },
        {
          message: CRITICAL_DEPENDENCY_WARNING,
        },
      ];
    }

    // Resolve .js imports to .ts in workspace packages (ESM convention)
    webpackConfig.resolve = {
      ...webpackConfig.resolve,
      extensionAlias: {
        ".js": [".ts", ".tsx", ".js", ".jsx"],
      },
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".wasm"],
    };

    return webpackConfig;
  },
});

const withVercel = (config: NextConfig): NextConfig =>
  env.VERCEL ? withSentry(config) : config;
const withAnalyze = (config: NextConfig): NextConfig =>
  env.ANALYZE === "true" ? withAnalyzer(config) : config;

const nextConfig: NextConfig = withAnalyze(withVercel(baseConfig));

export default nextConfig;
