import { keys } from "./keys";

/**
 * Initialize PostHog analytics with lazy loading.
 * PostHog is only loaded when this function is called, keeping it out of the initial bundle.
 */
export const initializeAnalytics = () => {
  const env = keys();
  const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!posthogKey || !posthogHost) return;

  // Lazy load PostHog to keep it out of the initial bundle
  import("posthog-js").then((posthog) => {
    posthog.default.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2025-05-24",
    });
  });
  // TODO: Add explicit SPA page view tracking if PostHog auto-capture is insufficient.
};
