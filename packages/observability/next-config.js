Object.defineProperty(exports, "__esModule", { value: true });
exports.withLogging = exports.withSentry = exports.sentryConfig = void 0;
const next_1 = require("@logtail/next");
const nextjs_1 = require("@sentry/nextjs");
const keys_1 = require("./keys");
exports.sentryConfig = {
  org: (0, keys_1.keys)().SENTRY_ORG,
  project: (0, keys_1.keys)().SENTRY_PROJECT,
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  /*
   * For all available options, see:
   * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
   */
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
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
};
const withSentry = (sourceConfig) => {
  const configWithTranspile = {
    ...sourceConfig,
    transpilePackages: ["@sentry/nextjs"],
  };
  return (0, nextjs_1.withSentryConfig)(
    configWithTranspile,
    exports.sentryConfig
  );
};
exports.withSentry = withSentry;
const withLogging = (config) => (0, next_1.withLogtail)(config);
exports.withLogging = withLogging;
