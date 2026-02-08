import { initializeAnalytics } from "@repo/analytics/instrumentation-client";
import { init } from "@sentry/nextjs";

export async function register() {
  init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.ingest\.sentry\.io/, // Allow Sentry ingest
    ],
  });
  initializeAnalytics();
}
