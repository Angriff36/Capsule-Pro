export { posthog as analytics } from "posthog-js";
export { trackApiError } from "./error-tracking";
export { PostHogProvider, useAnalyticsConsent, CONSENT_KEY } from "./posthog-provider";
export type { ConsentState } from "./posthog-provider";
