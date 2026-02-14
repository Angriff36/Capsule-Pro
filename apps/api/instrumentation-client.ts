import { initializeAnalytics } from "@repo/analytics/instrumentation-client";
import { initializeSentry } from "@repo/observability/client";

export function register() {
  initializeSentry();
  initializeAnalytics();
}
