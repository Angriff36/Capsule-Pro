import { withToolbar } from "@repo/feature-flags/lib/toolbar";
import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "./env";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223"
).replace(/\/$/, "");

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
      source: "/api/inventory/items/:path*",
      destination: `${apiBaseUrl}/api/inventory/items/:path*`,
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
    // Externalize pdfjs-dist and event-parser to avoid bundling issues
    // Using both serverComponentsExternalPackages and experimental.serverExternalPackages
    serverComponentsExternalPackages: ["pdfjs-dist", "@repo/event-parser"],
    experimental: {
      serverExternalPackages: ["pdfjs-dist", "@repo/event-parser"],
    },
    webpack: (webpackConfig, { isServer }) => {
      if (isServer) {
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
            return callback();
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
