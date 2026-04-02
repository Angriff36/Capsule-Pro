import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";

/**
 * Webpack configuration type (subset of webpack's Configuration)
 * Defined inline to avoid requiring @types/webpack as a dependency
 */
interface WebpackConfiguration {
  externals?:
    | string
    | RegExp
    | Record<string, unknown>
    | Array<
        | string
        | RegExp
        | Record<string, unknown>
        | ((
            data: { context: string; request: string },
            callback: (err?: Error | null, result?: string | boolean) => void
          ) => void)
      >
    | ((
        data: { context: string; request: string },
        callback: (err?: Error | null, result?: string | boolean) => void
      ) => void);
  ignoreWarnings?: Array<
    | string
    | RegExp
    | { module?: string | RegExp; message?: string | RegExp }
  >;
  resolve?: {
    extensionAlias?: Record<string, string[]>;
    extensions?: string[];
    [key: string]: unknown;
  };
}

const OPENTELEMETRY_EXCLUDE = /@opentelemetry/;
const SENTRY_EXCLUDE = /@sentry/;
const CRITICAL_DEPENDENCY_WARNING =
  /Critical dependency: the request of a dependency is an expression/;
const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";

let nextConfig: NextConfig = withLogging({
  ...config,
  distDir,
  async headers() {
    const corsHeaders = process.env.NODE_ENV !== "production"
      ? [
          { key: "Access-Control-Allow-Origin", value: "http://127.0.0.1:2221" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,X-Requested-With" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ]
      : [];

    const routes: Array<{ source: string; headers: Array<{ key: string; value: string }> }> = [];

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
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    });

    return routes;
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
    "@repo/supplier-connectors",
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
    webpackConfig: WebpackConfiguration,
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
      ] as WebpackConfiguration["externals"];

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

    // Resolve .js imports to .ts in workspace packages (ESM convention)
    // Also ensure extensionless imports resolve to .ts files
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

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
