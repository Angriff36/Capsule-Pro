export async function register() {
  const { initializeSentry } = await import("@repo/observability/client");
  const { initializeAnalytics } = await import(
    "@repo/analytics/instrumentation-client"
  );

  initializeSentry();
  initializeAnalytics();
}
