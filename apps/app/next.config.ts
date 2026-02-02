import { withToolbar } from "@repo/feature-flags/lib/toolbar";
import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "./env";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223"
).replace(/\/$/, "");

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
      source: "/api/kitchen/waste/:path*",
      destination: `${apiBaseUrl}/api/kitchen/waste/:path*`,
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
  ];
};

let nextConfig: NextConfig = withToolbar(
  withLogging({
    ...config,
    rewrites,
    // Externalize pdfjs-dist, event-parser, and ably to avoid bundling issues
    // ably: Turbopack + Ably causes keyv dynamic require failures in SSR
    serverExternalPackages: ["pdfjs-dist", "@repo/event-parser", "ably"],
    webpack: (webpackConfig: WebpackConfig, context: WebpackContext) => {
      if (context.isServer) {
        // Externalize pdfjs-dist - use function to catch all nested imports
        const existingExternals = webpackConfig.externals || [];
        const pdfjsExternals = [
          ({ request }: { request: string }, callback: (err: null | Error, result?: string) => void) => {
            // Externalize all pdfjs-dist imports
            if (request.startsWith('pdfjs-dist') || request === 'pdf.worker.mjs') {
              // Convert to commonjs reference
              const moduleName = request.startsWith('pdfjs-dist') ? request : 'pdfjs-dist/build/pdf.worker.mjs';
              return callback(null, `commonjs ${moduleName}`);
            }
            // Continue to other externals
            return callback(null);
          },
        ];

        // Combine with existing externals
        webpackConfig.externals = [
          ...Array.isArray(existingExternals) ? existingExternals : [existingExternals],
          ...pdfjsExternals,
          { "@repo/event-parser": "@repo/event-parser" },
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
