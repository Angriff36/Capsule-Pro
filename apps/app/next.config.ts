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
  ];
};

let nextConfig: NextConfig = withToolbar(
  withLogging({
    ...config,
    rewrites,
  })
);

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
