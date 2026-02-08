import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import type { Configuration } from "webpack";
import { env } from "@/env";

const OPENTELEMETRY_EXCLUDE = /@opentelemetry/;
const SENTRY_EXCLUDE = /@sentry/;
const CRITICAL_DEPENDENCY_WARNING =
  /Critical dependency: the request of a dependency is an expression/;

let nextConfig: NextConfig = withLogging({
  ...config,
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
  ],
  experimental: {
    optimizePackageImports: ["date-fns"],
  },
  // Externalize pdfjs-dist to avoid bundling issues in API routes
  serverExternalPackages: [
    "pdfjs-dist",
    "ably",
    "got",
    "keyv",
    "cacheable-request",
  ],
  webpack: (
    webpackConfig: Configuration,
    { isServer }: { isServer: boolean }
  ) => {
    if (isServer) {
      // Exclude pdfjs-dist worker from server-side bundling
      const externals = webpackConfig.externals;
      let externalsArray: unknown[] = [];
      if (Array.isArray(externals)) {
        externalsArray = externals;
      } else if (externals) {
        externalsArray = [externals];
      }

      webpackConfig.externals = [
        ...externalsArray,
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
      ];

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
