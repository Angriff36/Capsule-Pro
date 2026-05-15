import { withCMS } from "@repo/cms/next-config";
import { withToolbar } from "@repo/feature-flags/lib/toolbar";
import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";

const baseConfig = withToolbar(withLogging(config)) as NextConfig;

let nextConfig: NextConfig = {
  ...baseConfig,
  // Enable source maps for Sentry error tracking in production.
  // Source maps are deleted after upload to Sentry.
  // Only emit when Sentry is configured — avoids exposing source in builds without Sentry.
  productionBrowserSourceMaps:
    process.env.VERCEL === "1" && Boolean(process.env.SENTRY_AUTH_TOKEN),
  // Type checking enforced at build time. tsconfig passes cleanly.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    ...baseConfig.images,
    remotePatterns: [
      ...(baseConfig.images?.remotePatterns ?? []),
      {
        protocol: "https",
        hostname: "assets.basehub.com",
      },
    ],
  },
};

if (process.env.NODE_ENV === "production") {
  const redirects: NextConfig["redirects"] = async () => [
    {
      source: "/legal",
      destination: "/legal/privacy",
      statusCode: 301,
    },
  ];

  nextConfig.redirects = redirects;
}

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withCMS(nextConfig);
