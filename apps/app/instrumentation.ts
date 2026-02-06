// apps/app/instrumentation.ts

export async function register() {
  // Next sets NEXT_RUNTIME to 'nodejs' or 'edge'
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
