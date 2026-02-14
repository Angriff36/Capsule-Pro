import { withLogtail } from "@logtail/next";
import { withSentryConfig } from "@sentry/nextjs";
import { keys } from "./keys";

const sentryKeys = keys();
const hasSentryUploadConfig =
  sentryKeys.SENTRY_ORG &&
  sentryKeys.SENTRY_PROJECT &&
  sentryKeys.SENTRY_AUTH_TOKEN;

export const sentryConfig: Parameters<typeof withSentryConfig>[1] = {
  org: sentryKeys.SENTRY_ORG,
  project: sentryKeys.SENTRY_PROJECT,
  authToken: sentryKeys.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Source map configuration - production-grade approach
  sourcemaps: {
    disable: !hasSentryUploadConfig,

    // Only upload source maps for files we actually care about
    // This dramatically reduces upload time and build size
    assets: [
      // Upload app code source maps
      ".next/static/chunks/app/**/*.js",
      ".next/static/chunks/pages/**/*.js",

      // Skip framework chunks (React, Next.js internals)
      "!.next/static/chunks/framework-*.js",
      "!.next/static/chunks/main-*.js",
      "!.next/static/chunks/webpack-*.js",
      "!.next/static/chunks/polyfills-*.js",

      // Skip node_modules chunks unless they're our workspace packages
      "!.next/static/chunks/**/node_modules/**",
      ".next/static/chunks/**/@repo/**/*.js",
      ".next/static/chunks/**/@manifest/**/*.js",
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

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  /*
   * Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   * See the following for more information:
   * https://docs.sentry.io/product/crons/
   * https://vercel.com/docs/cron-jobs
   */
  automaticVercelMonitors: true,

  // Disable telemetry to speed up builds
  telemetry: false,
};

export const withSentry = (sourceConfig: object): object => {
  const configWithTranspile = {
    ...sourceConfig,
    transpilePackages: ["@sentry/nextjs"],
  };

  return withSentryConfig(configWithTranspile, sentryConfig);
};

export const withLogging = (config: object): object => withLogtail(config);
