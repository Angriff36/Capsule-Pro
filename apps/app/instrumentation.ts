// apps/app/instrumentation.ts

import { captureRequestError } from "@sentry/nextjs";

export async function register() {
  // Only initialize Sentry if DSN is configured
  // This prevents loading Sentry SDK when not in use, reducing edge bundle size
  const hasSentryDsn = Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  );

  if (!hasSentryDsn) {
    return;
  }

  // Next sets NEXT_RUNTIME to 'nodejs' or 'edge'
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = captureRequestError;
