/*
 * This file configures the initialization of Sentry for edge runtime.
 * The config you add here will be used whenever a page or API route is loaded in an edge runtime.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 *
 * Note: This file is dynamically imported by instrumentation.ts, so imports here
 * are already lazy-loaded at the edge runtime level.
 */

import { keys } from "./keys";

export const initializeSentry = async (): Promise<void> => {
  // Import Sentry dynamically to reduce edge bundle size when not using Sentry
  const Sentry = await import("@sentry/nextjs");

  const dsn = keys().NEXT_PUBLIC_SENTRY_DSN;

  // Don't initialize if DSN is not configured
  if (!dsn) {
    return;
  }

  Sentry.default.init({
    dsn,

    // Enable logging
    enableLogs: true,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Integrations for console logging
    integrations: [
      // Send console.log, console.error, and console.warn calls as logs to Sentry
      Sentry.default.consoleLoggingIntegration({
        levels: ["log", "error", "warn"],
      }),
    ],
  });
};
