// apps/app/instrumentation-client.ts
//
// Browser-only bootstrap that Next.js loads before the client app starts.
// Constraints (do not relax without re-reading the Next.js / Sentry docs):
//   * Side-effect only. No `register()` export — Next calls this file's
//     top-level statements at app start; modern Sentry-Next examples
//     follow the same pattern.
//   * No imports from server-only code, env-validation modules
//     (`@t3-oss/env-nextjs`, our `keys()` wrappers), database/prisma,
//     Node builtins, or repo packages that pull server dependencies.
//   * Only read `process.env.NEXT_PUBLIC_*` and `process.env.NODE_ENV` —
//     these are statically inlined by Next at build time and therefore
//     do not require the `next/dist/build/polyfills/process.js` shim.
//
// History: a previous version imported `@repo/analytics/instrumentation-client`
// and `@repo/observability/client`, both of which transitively pulled
// `@t3-oss/env-nextjs` with a `server:` field set, causing Turbopack to
// emit a process polyfill that race-failed on instrumentation load and
// blocked /sign-in from rendering.
import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
        process.env.NEXT_PUBLIC_VERCEL_ENV ||
        undefined,
      enableLogs: true,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.1,
      tracePropagationTargets: [
        "localhost",
        /^\//,
        /^https:\/\/[a-z0-9-]+\.vercel\.app/,
        /^https:\/\/[a-z0-9-]+\.capsule\.pro/,
      ],
      normalizeDepth: 10,
      debug: false,
      integrations: [
        Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
      ],
      beforeSendTransaction(event) {
        const name = event.transaction ?? "";
        if (
          name.startsWith("/_next") ||
          name.startsWith("/favicon") ||
          name.startsWith("/monitoring")
        ) {
          return null;
        }
        return event;
      },
    });
  }

  // PostHog: lazy-load only when public keys are present so a missing
  // analytics pipeline cannot block sign-in. The React tree also calls
  // `posthog.init` via PostHogProvider (consent-gated); posthog-js is
  // idempotent on duplicate init for the same key.
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (posthogKey && posthogHost) {
    void import("posthog-js").then((ph) => {
      ph.default.init(posthogKey, {
        api_host: posthogHost,
        defaults: "2025-05-24",
      });
    });
  }
}

// Required by Next.js 16 + @sentry/nextjs 10 for client-side router
// transition instrumentation. Safe to export even when Sentry.init was
// skipped — the helper no-ops if the SDK has not been initialized.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
