import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";

let nextConfig: NextConfig = withLogging({
  ...config,
  // Externalize pdfjs-dist to avoid bundling issues in API routes
  serverExternalPackages: [
    "pdfjs-dist",
    "ably",
    "got",
    "keyv",
    "cacheable-request",
  ],
  webpack: (
    config: { externals?: string[] },
    { isServer }: { isServer: boolean }
  ) => {
    if (isServer) {
      // Exclude pdfjs-dist worker from server-side bundling
      config.externals = [
        ...(config.externals || []),
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
      ];
    }
    return config;
  },
});

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
