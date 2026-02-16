// apps/app/sentry.edge.config.ts

import { init, vercelAIIntegration } from "@sentry/nextjs";

const getSentryEnvironment = (): string | undefined => {
  const explicit = process.env.SENTRY_ENVIRONMENT?.trim();
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

init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  environment: getSentryEnvironment(),
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "1.0"),
  sendDefaultPii: true,
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/.*\.ingest\.sentry\.io/, // Allow Sentry ingest
  ],

  integrations: [
    vercelAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});
