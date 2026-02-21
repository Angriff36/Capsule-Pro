import { captureRequestError } from "@sentry/nextjs";

// Only initialize Sentry if DSN is configured
// This prevents loading the SDK when not in use
export async function register() {
  const hasSentryDsn = Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  );

  if (!hasSentryDsn) {
    return;
  }

  const { initializeSentry } = await import(
    "@repo/observability/instrumentation"
  );
  await initializeSentry();
}

export const onRequestError = captureRequestError;
