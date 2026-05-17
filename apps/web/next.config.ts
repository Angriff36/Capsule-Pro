import { withCMS } from "@repo/cms/next-config";
import { withToolbar } from "@repo/feature-flags/lib/toolbar";
import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";

const baseConfig = withToolbar(withLogging(config)) as NextConfig;

const appConfig: NextConfig = {
  ...baseConfig,
  // Enable source maps for Sentry error tracking in production
  // Source maps are deleted after upload to Sentry (configured in sentryConfig.sourcemaps.deleteSourcemapsAfterUpload)
  productionBrowserSourceMaps: true,
  // Fail build on TS errors; pnpm check:all also gates pre-push and CI.
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
  async headers() {
    const baseHeaders = await (baseConfig.headers?.() ?? []);
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.clerk.com https://*.clerk.accounts.dev https://us-assets.i.posthog.com https://www.googletagmanager.com blob:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: https://img.clerk.com https://assets.basehub.com https://*.blob.vercel-storage.com https://images.unsplash.com",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com https://www.google-analytics.com",
      "frame-ancestors 'none'",
      "frame-src 'self' https://*.clerk.accounts.dev",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    return baseHeaders.map((route) => {
      if (route.source === "/(.*)") {
        return {
          ...route,
          headers: [
            ...route.headers,
            { key: "Content-Security-Policy", value: csp },
          ],
        };
      }
      return route;
    });
  },
  ...(process.env.NODE_ENV === "production"
    ? {
        redirects: async () => [
          {
            source: "/legal",
            destination: "/legal/privacy",
            statusCode: 301 as const,
          },
        ],
      }
    : {}),
};

const withVercel = (config: NextConfig): NextConfig =>
  env.VERCEL ? withSentry(config) : config;
const withAnalyze = (config: NextConfig): NextConfig =>
  env.ANALYZE === "true" ? withAnalyzer(config) : config;

const nextConfig: NextConfig = withAnalyze(withVercel(appConfig));

export default withCMS(nextConfig);
