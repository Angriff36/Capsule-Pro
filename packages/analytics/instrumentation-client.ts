import posthog from "posthog-js";
import { keys } from "./keys";

export const initializeAnalytics = () => {
  posthog.init(keys().NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: keys().NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2025-05-24",
  });
  // TODO: Add explicit SPA page view tracking if PostHog auto-capture is insufficient.
};
