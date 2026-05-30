import { withLogtail } from "@logtail/next";
import { withSentryConfig } from "@sentry/nextjs";
import { keys } from "./keys";

const env = keys();
const hasSentryUploadConfig =
  env.SENTRY_ORG &&
  env.SENTRY_PROJECT &&
  env.SENTRY_AUTH_TOKEN;

export const sentryConfig: Parameters<typeof withSentryConfig>[1] = {
  org: env.SENTRY_ORG,
  project: env.SENTRY_PROJECT,
  authToken: env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Source map configuration - production-grade approach
  sourcemaps: {
    disable: !hasSentryUploadConfig,

    // Upload source maps for all app code
    // Sentry will automatically handle framework chunks via .sentryignore
    assets: [
      // App and pages code - the actual application
      ".next/static/chunks/app/**/*.js",
      ".next/static/chunks/pages/**/*.js",
      // Workspace packages that get bundled
      ".next/static/chunks/**/*.js",
    ],

    // Delete source maps after upload to keep deployment size small
    deleteSourcemapsAfterUpload: true,
  },

  release: {
    create: Boolean(hasSentryUploadConfig),
    // Use git commit SHA for release tracking
    name: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  },

  /*
   * For all available options, see:
   * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
   */

  // Only upload client-side source maps for user-facing code
  // This is the key setting that prevents uploading 1000s of files
  widenClientFileUpload: false,

  /*
   * Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
   * This can increase your server load as well as your hosting bill.
   * Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
   * side errors will fail.
   */
  tunnelRoute: "/monitoring",

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },

  // Disable telemetry to speed up builds
  telemetry: false,

  // Never fail the production build/deploy because of a source-map upload or
  // release-creation problem (e.g. a 403 from a token missing release scope).
  // Monitoring instrumentation is best-effort; log and continue instead.
  errorHandler: (error) => {
    console.warn(
      `[observability] Sentry build step failed (non-fatal): ${error.message}`
    );
  },
};

export const withSentry = (sourceConfig: object): object => {
  const configWithTranspile = {
    ...sourceConfig,
    transpilePackages: ["@sentry/nextjs"],
  };

  return withSentryConfig(configWithTranspile, sentryConfig);
};

export const withLogging = (config: object): object => {
  const hasBetterStackSourceToken = Boolean(
    env.BETTER_STACK_SOURCE_TOKEN ||
      env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN ||
      env.LOGTAIL_SOURCE_TOKEN ||
      env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN
  );
  const hasBetterStackIngestUrl = Boolean(
    env.BETTER_STACK_INGESTING_URL ||
      env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL ||
      env.LOGTAIL_URL ||
      env.NEXT_PUBLIC_LOGTAIL_URL
  );

  if (!(hasBetterStackSourceToken && hasBetterStackIngestUrl)) {
    return config;
  }
  return withLogtail(config);
};
