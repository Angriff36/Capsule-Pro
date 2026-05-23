/**
 * Shared correlation for Sentry remediation pipeline observability.
 * Use the same fields at webhook receipt, job enqueue, and worker pickup
 * so logs can be joined without inferring health from static files.
 */
/** Unique substring searched in Sentry UI / logs for controlled canary runs. */
declare const CAPSULE_SENTRY_CANARY_FINGERPRINT = "[CAPSULE_CANARY] sentry-e2e-verify-2026-04";
type SentryRemediationPipelineStage = "sentry_canary_emit" | "sentry_webhook_received" | "sentry_job_enqueued" | "sentry_worker_pickup" | "sentry_worker_complete" | "sentry_worker_failed";
declare const buildPipelineCorrelationId: (parts: {
    sentryIssueId: string;
    sentryEventId: string | null;
}) => string;
declare const pipelineLogFields: (stage: SentryRemediationPipelineStage, correlationId: string, extra?: Record<string, unknown>) => Record<string, unknown>;

export { CAPSULE_SENTRY_CANARY_FINGERPRINT, type SentryRemediationPipelineStage, buildPipelineCorrelationId, pipelineLogFields };
