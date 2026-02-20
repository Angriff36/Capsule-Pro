import { createHmac, timingSafeEqual } from "node:crypto";
import type { ParsedSentryIssue, SentryIssueAlertPayload } from "./types.js";
import { SentryIssueAlertSchema } from "./types.js";

export type { SentryIssueAlertPayload };

/**
 * Verify Sentry webhook signature using HMAC-SHA256
 *
 * Sentry sends a signature in the `Sentry-Hook-Signature` header
 * which is the HMAC-SHA256 hash of the request body using the client secret.
 *
 * @param body - Raw request body as string
 * @param signature - Value from Sentry-Hook-Signature header
 * @param secret - Your Sentry internal integration client secret
 * @returns true if signature is valid
 */
export const verifySentrySignature = (
  body: string,
  signature: string,
  secret: string
): boolean => {
  if (!(body && signature && secret)) {
    return false;
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(body, "utf8");
  const digest = hmac.digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const digestBuffer = Buffer.from(digest, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    if (digestBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(digestBuffer, signatureBuffer);
  } catch {
    // If hex parsing fails, fall back to string comparison
    // (less secure but handles edge cases)
    return digest === signature;
  }
};

/**
 * Validate and parse Sentry webhook payload
 *
 * @param payload - Raw JSON payload from webhook
 * @returns Parsed and validated payload or throws on validation error
 */
export const parseSentryWebhookPayload = (
  payload: unknown
): SentryIssueAlertPayload => {
  return SentryIssueAlertSchema.parse(payload);
};

/**
 * Extract organization and project slugs from Sentry URLs
 * Sentry URLs follow the pattern: https://sentry.io/organizations/{org}/issues/{issue}/
 * or: https://sentry.io/{org}/{project}/issues/{issue}/
 */
const extractSlugsFromUrl = (
  url: string
): { organizationSlug: string; projectSlug: string } => {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    // Check for organization pattern: /organizations/{org}/...
    const orgIndex = pathParts.indexOf("organizations");
    if (orgIndex !== -1 && orgIndex + 1 < pathParts.length) {
      const organizationSlug = pathParts[orgIndex + 1];
      // Project slug might be in the URL or we use a default
      const projectIndex = pathParts.indexOf("projects");
      const projectSlug =
        projectIndex !== -1 && projectIndex + 1 < pathParts.length
          ? pathParts[projectIndex + 1]
          : "default";
      return { organizationSlug, projectSlug };
    }

    // Legacy pattern: /{org}/{project}/issues/{issue}/
    if (pathParts.length >= 2) {
      return {
        organizationSlug: pathParts[0],
        projectSlug: pathParts[1],
      };
    }

    return { organizationSlug: "unknown", projectSlug: "unknown" };
  } catch {
    return { organizationSlug: "unknown", projectSlug: "unknown" };
  }
};

/**
 * Parse Sentry Issue Alert payload into a structured format for job processing
 *
 * @param payload - Validated Sentry webhook payload
 * @returns Structured data for job processing
 */
export const parseSentryIssue = (
  payload: SentryIssueAlertPayload
): ParsedSentryIssue => {
  const { data } = payload;
  const { event } = data;

  // Extract organization/project from URLs
  const { organizationSlug, projectSlug } = extractSlugsFromUrl(event.web_url);

  // Extract stack frames from exception
  const stackFrames =
    event.exception?.values?.[0]?.stacktrace?.frames
      ?.map((frame) => ({
        filename: frame.filename ?? null,
        function: frame.function ?? null,
        line: frame.lineno ?? null,
        column: frame.colno ?? null,
        absPath: frame.abs_path ?? null,
      }))
      .reverse() ?? null; // Reverse to get chronological order

  // Get first exception for type/value
  const firstException = event.exception?.values?.[0];

  return {
    issueId: event.issue_id,
    eventId: event.event_id ?? null,
    organizationSlug,
    projectSlug: event.project_slug ?? projectSlug,
    environment: event.environment ?? null,
    release: event.release ?? null,
    title: event.title ?? data.triggered_rule ?? "Unknown Error",
    message: event.message ?? null,
    culprit: event.culprit ?? null,
    issueUrl: event.issue_url,
    webUrl: event.web_url,
    exceptionType: firstException?.type ?? null,
    exceptionValue: firstException?.value ?? null,
    stackFrames,
    tags: event.tags ?? {},
    rawPayload: payload,
  };
};

/**
 * Check if webhook resource type is an issue alert
 */
export const isIssueAlertWebhook = (resourceHeader: string | null): boolean => {
  return resourceHeader === "event_alert";
};

/**
 * Webhook headers expected from Sentry
 */
export interface SentryWebhookHeaders {
  sentryHookSignature: string | null;
  sentryHookTimestamp: string | null;
  sentryHookResource: string | null;
  requestId: string | null;
}

/**
 * Extract Sentry webhook headers from request headers
 */
export const extractSentryHeaders = (
  headers: Headers
): SentryWebhookHeaders => {
  return {
    sentryHookSignature: headers.get("sentry-hook-signature"),
    sentryHookTimestamp: headers.get("sentry-hook-timestamp"),
    sentryHookResource: headers.get("sentry-hook-resource"),
    requestId: headers.get("request-id"),
  };
};
