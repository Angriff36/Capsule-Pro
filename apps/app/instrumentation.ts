// apps/app/instrumentation.ts

export async function register() {
  // Only initialize Sentry if DSN is configured
  // This prevents loading Sentry SDK when not in use, reducing edge bundle size
  const hasSentryDsn = Boolean(process.env.SENTRY_DSN);

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
