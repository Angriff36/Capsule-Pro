/*
 * This file configures the initialization of Sentry for edge runtime.
 * The config you add here will be used whenever a page or API route is loaded in an edge runtime.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 *
 * Note: This file is dynamically imported by instrumentation.ts, so imports here
 * are already lazy-loaded at the edge runtime level.
 */

import {
  consoleLoggingIntegration,
  init,
  vercelAIIntegration,
} from "@sentry/nextjs";
import { keys } from "./keys";
import { tracesSampler } from "./tracing";

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

  const vercelEnv = keys().VERCEL_ENV;
  if (vercelEnv) {
    return vercelEnv;
  }

  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv) {
    return nodeEnv;
  }

  return;
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

    // tracesSampler drops noise routes and applies the configured sample rate
    tracesSampler,

    // Propagate trace context to these targets for distributed tracing
    tracePropagationTargets: [
      "localhost",
      /^\//,
      /^https:\/\/[a-z0-9-]+\.vercel\.app/,
      /^https:\/\/[a-z0-9-]+\.capsule\.pro/,
    ],

    // Normalize nested data structures to prevent oversized payloads
    normalizeDepth: 10,

    // Identify this server in Sentry UI
    serverName: process.env.VERCEL_URL ?? undefined,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Integrations for console logging + AI SDK tracing
    integrations: [
      consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
      vercelAIIntegration(),
    ],
    beforeSend(event) {
      if (shouldDropDevWebpackCacheError(event)) {
        return null;
      }

      // Filter out Next.js HTTP error fallback for 404s — not real errors
      const excType = event.exception?.values?.[0]?.type ?? "";
      if (excType.startsWith("NEXT_HTTP_ERROR_FALLBACK;")) {
        return null;
      }

      return event;
    },
    beforeSendTransaction(event) {
      // Drop noise transactions from static assets and health checks
      const name = event.transaction ?? "";
      if (
        name.startsWith("/_next") ||
        name.startsWith("/favicon") ||
        name.startsWith("/api/health") ||
        name.startsWith("/api/cron")
      ) {
        return null;
      }
      return event;
    },
  });
};
