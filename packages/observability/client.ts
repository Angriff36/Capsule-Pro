/*
 * This file configures the initialization of Sentry on the client.
 * The config you add here will be used whenever a users loads a page in their browser.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 *
 * Bundle optimization: Sentry configuration is environment-aware to reduce overhead.
 */

import * as Sentry from "@sentry/nextjs";
import { keys } from "./keys";

const isProduction = process.env.NODE_ENV === "production";

// Optimize sample rates for production to reduce bundle and network overhead
const tracesSampleRate = isProduction ? 0.1 : 1;
const replaysSessionSampleRate = isProduction ? 0 : 0.1;
const replaysOnErrorSampleRate = isProduction ? 0.1 : 1;

const getSentryEnvironment = () => {
  const explicit = keys().NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim();
  if (explicit) {
    return explicit;
  }

  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV?.trim();
  if (vercelEnv) {
    return vercelEnv;
  }

  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv) {
    return nodeEnv;
  }

  return undefined;
};

export const initializeSentry = () => {
  Sentry.init({
    dsn: keys().NEXT_PUBLIC_SENTRY_DSN,
    environment: getSentryEnvironment(),

    // Enable logging
    enableLogs: true,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    replaysOnErrorSampleRate,

    /*
     * This sets the sample rate. Disabled in production to reduce bundle size.
     * Session replay is a heavy feature (~100-150KB).
     */
    replaysSessionSampleRate,

    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
      ...(replaysSessionSampleRate > 0 || replaysOnErrorSampleRate > 0
        ? [
            Sentry.replayIntegration({
              // Additional Replay configuration goes in here, for example:
              maskAllText: true,
              blockAllMedia: true,
            }),
          ]
        : []),
      // Send console.log, console.error, and console.warn calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
    ],
  });
};
