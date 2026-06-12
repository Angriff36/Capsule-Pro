import { keys } from "./keys";

/**
 * Initialize PostHog analytics with lazy loading.
 * PostHog is only loaded when this function is called, keeping it out of the initial bundle.
 *
 * SPA page view tracking is handled automatically by posthog-js's RSC/Next.js
 * integration when the PostHogProvider wraps the app. The provider (posthog-provider.tsx)
 * uses `posthog-js/react` which registers a router observer that captures
 * navigation events (pushState / replaceState / popstate).
 *
 * For custom events outside of page views, import `posthog` directly:
 *   import posthog from 'posthog-js';
 *   posthog.capture('event_name', { properties });
 */
export const initializeAnalytics = () => {
  const env = keys();
  const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!(posthogKey && posthogHost)) {
    return;
  }

  // Lazy load PostHog to keep it out of the initial bundle.
  // Actual init is handled by PostHogProvider in posthog-provider.tsx
  // to ensure consent gating. This import just ensures the module is
  // available for the Next.js instrumentation hook.
  import("posthog-js").then((posthog) => {
    posthog.default.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2025-05-24",
    });
  });
};
