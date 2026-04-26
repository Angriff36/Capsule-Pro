import posthog from "posthog-js";

/**
 * Track a client-side API error in PostHog.
 * Call this when apiFetch returns a non-OK response.
 */
export function trackApiError(
  endpoint: string,
  status: number,
  errorCode?: string
): void {
  posthog.capture("error:api_request_failed", {
    endpoint,
    status_code: status,
    error_code: errorCode,
  });
}
