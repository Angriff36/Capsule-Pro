// apps/app/sentry.server.config.ts

import { init, vercelAIIntegration } from "@sentry/nextjs";

init({
  dsn: process.env.SENTRY_DSN ?? "",
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "1.0"),
  sendDefaultPii: true,

  integrations: [
    vercelAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});
