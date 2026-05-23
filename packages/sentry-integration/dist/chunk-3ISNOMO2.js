// src/pipeline-correlation.ts
var CAPSULE_SENTRY_CANARY_FINGERPRINT = "[CAPSULE_CANARY] sentry-e2e-verify-2026-04";
var buildPipelineCorrelationId = (parts) => `${parts.sentryIssueId}:${parts.sentryEventId ?? "no-event"}`;
var pipelineLogFields = (stage, correlationId, extra) => ({
  pipeline: "sentry_remediation",
  pipeline_stage: stage,
  pipeline_correlation_id: correlationId,
  ...extra
});

export {
  CAPSULE_SENTRY_CANARY_FINGERPRINT,
  buildPipelineCorrelationId,
  pipelineLogFields
};
//# sourceMappingURL=chunk-3ISNOMO2.js.map