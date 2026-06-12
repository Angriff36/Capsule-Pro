import { initializeAnalytics } from "@repo/analytics/instrumentation-client";
import { initializeSentry } from "@repo/observability/client";

export async function register() {
  if (process.env.NODE_ENV === "development") {
    return;
  }
  initializeSentry();
  initializeAnalytics();
}
