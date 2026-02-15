import { keys } from "./keys";

/**
 * Initialize PostHog analytics with lazy loading.
 * PostHog is only loaded when this function is called, keeping it out of the initial bundle.
 */
export const initializeAnalytics = () => {
  // Lazy load PostHog to keep it out of the initial bundle
  import("posthog-js").then((posthog) => {
    posthog.default.init(keys().NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: keys().NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2025-05-24",
    });
  });
  // TODO: Add explicit SPA page view tracking if PostHog auto-capture is insufficient.
};
