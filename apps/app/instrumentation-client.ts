import { initializeAnalytics } from "@repo/analytics/instrumentation-client";
import { init } from "@sentry/nextjs";

const getSentryEnvironment = (): string | undefined => {
  const explicit = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim();
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

export async function register() {
  init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: getSentryEnvironment(),
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.ingest\.sentry\.io/, // Allow Sentry ingest
    ],
  });
  initializeAnalytics();
}
