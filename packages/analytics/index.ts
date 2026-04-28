export { posthog as analytics } from "posthog-js";
export { trackApiError } from "./error-tracking";
export type { ConsentState } from "./posthog-provider";
export {
  CONSENT_KEY,
  PostHogProvider,
  useAnalyticsConsent,
} from "./posthog-provider";
