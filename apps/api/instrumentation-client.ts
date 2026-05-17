import { initializeAnalytics } from "@repo/analytics/instrumentation-client";
import { initializeSentry } from "@repo/observability/client";
import { captureRouterTransitionStart } from "@sentry/nextjs";

export function register() {
  initializeSentry();
  initializeAnalytics();
}

// Required by @sentry/nextjs for client-side navigation span instrumentation.
// Without this, route transitions produce no spans in Sentry.
export const onRouterTransitionStart = captureRouterTransitionStart;
