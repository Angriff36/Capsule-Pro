/*
 * This file configures the initialization of Sentry for edge runtime.
 * The config you add here will be used whenever a page or API route is loaded in an edge runtime.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 *
 * Note: This file is dynamically imported by instrumentation.ts, so imports here
 * are already lazy-loaded at the edge runtime level.
 */

import { consoleLoggingIntegration, init } from "@sentry/nextjs";
import { keys } from "./keys";

const shouldDropDevWebpackCacheError = (event: {
  message?: string;
}): boolean => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return event.message?.includes(".next-dev\\cache\\webpack") ?? false;
};

const getSentryEnvironment = () => {
  const explicit = keys().SENTRY_ENVIRONMENT?.trim();
  if (explicit) {
    return explicit;
  }

  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv) {
    return vercelEnv;
  }

  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv) {
    return nodeEnv;
  }

  return undefined;
};

export const initializeSentry = (): ReturnType<typeof init> => {
  const dsn = keys().NEXT_PUBLIC_SENTRY_DSN;

  // Don't initialize if DSN is not configured
  if (!dsn) {
    return;
  }

  return init({
    dsn,
    environment: getSentryEnvironment(),

    // Enable logging
    enableLogs: true,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Integrations for console logging
    integrations: [
      consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
    ],
    beforeSend(event) {
      if (shouldDropDevWebpackCacheError(event)) {
        return null;
      }

      return event;
    },
  });
};
