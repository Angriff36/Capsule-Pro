import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import type { Configuration } from "webpack";
import { env } from "@/env";

const OPENTELEMETRY_EXCLUDE = /@opentelemetry/;
const SENTRY_EXCLUDE = /@sentry/;
const CRITICAL_DEPENDENCY_WARNING =
  /Critical dependency: the request of a dependency is an expression/;
const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";

let nextConfig: NextConfig = withLogging({
  ...config,
  distDir,
  // Allow cross-origin requests from the app server in development
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [
        {
          source: "/api/:path*",
          headers: [
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
          ],
        },
      ];
    }
    return [];
  },
  // Disable type checking during build to avoid React type conflicts
  typescript: {
    ignoreBuildErrors: true,
  },
  // Transpile workspace packages
  transpilePackages: [
    "@repo/auth",
    "@repo/database",
    "@repo/analytics",
    "@repo/observability",
    "@repo/security",
    "@repo/event-parser",
    "@repo/manifest",
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
  // Externalize pdfjs-dist to avoid bundling issues in API routes
  serverExternalPackages: [
    "pdfjs-dist",
    "ably",
    "got",
    "keyv",
    "cacheable-request",
    "pdfkit",
    "@capsule-pro/sales-reporting",
  ],
  webpack: (
    webpackConfig: Configuration,
    { isServer }: { isServer: boolean }
  ) => {
    if (isServer) {
      // Exclude pdfjs-dist worker from server-side bundling
      const existingExternals = webpackConfig.externals;
      const pdfjsExternal = "pdfjs-dist/legacy/build/pdf.worker.mjs";

      // Build the externals array based on what already exists
      const baseExternals: Array<
        | string
        | RegExp
        | Record<string, unknown>
        | ((
            data: { context: string; request: string },
            callback: (err?: Error | null, result?: string | boolean) => void
          ) => void)
      > = [];

      if (Array.isArray(existingExternals)) {
        baseExternals.push(...(existingExternals as typeof baseExternals));
      } else if (existingExternals) {
        baseExternals.push(
          existingExternals as
            | string
            | RegExp
            | Record<string, unknown>
            | ((
                data: { context: string; request: string },
                callback: (
                  err?: Error | null,
                  result?: string | boolean
                ) => void
              ) => void)
        );
      }

      // Type cast to satisfy TypeScript - webpack handles this at runtime
      webpackConfig.externals = [
        ...baseExternals,
        pdfjsExternal,
      ] as Configuration["externals"];

      // Suppress 'Critical dependency' and large string warnings
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        { module: OPENTELEMETRY_EXCLUDE },
        { module: SENTRY_EXCLUDE },
        {
          message: CRITICAL_DEPENDENCY_WARNING,
        },
      ];
    }
    return webpackConfig;
  },
});

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
