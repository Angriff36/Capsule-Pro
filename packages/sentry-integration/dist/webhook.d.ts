import type { ParsedSentryIssue, SentryIssueAlertPayload } from "./types.js";
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
export declare const verifySentrySignature: (body: string, signature: string, secret: string) => boolean;
/**
 * Validate and parse Sentry webhook payload
 *
 * @param payload - Raw JSON payload from webhook
 * @returns Parsed and validated payload or throws on validation error
 */
export declare const parseSentryWebhookPayload: (payload: unknown) => SentryIssueAlertPayload;
/**
 * Parse Sentry Issue Alert payload into a structured format for job processing
 *
 * @param payload - Validated Sentry webhook payload
 * @returns Structured data for job processing
 */
export declare const parseSentryIssue: (payload: SentryIssueAlertPayload) => ParsedSentryIssue;
/**
 * Check if webhook resource type is an issue alert
 */
export declare const isIssueAlertWebhook: (resourceHeader: string | null) => boolean;
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
export declare const extractSentryHeaders: (headers: Headers) => SentryWebhookHeaders;
//# sourceMappingURL=webhook.d.ts.map