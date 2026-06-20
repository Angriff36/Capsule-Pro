/**
 * OpenTelemetry tracing for the Manifest command path.
 *
 * A single governed user action fans out through dispatcher → RuntimeEngine
 * → middleware chains → reaction dispatch. This module wraps that fan-out in
 * OTLP-exportable spans so a p99 latency spike can be attributed to a specific
 * command, middleware, or reaction instead of guessed at.
 *
 * Design notes:
 * - Uses the GLOBAL OpenTelemetry API only. It does NOT register a
 *   TracerProvider or exporter — the app already runs one (Sentry's Next.js
 *   SDK is built on OTel), so spans flow into whatever OTLP backend the
 *   deployment configures (Jaeger, Honeycomb, Grafana Tempo, …). When no
 *   provider is registered, `trace.getTracer` returns a no-op tracer and these
 *   helpers cost effectively nothing.
 * - `startActiveSpan` makes the span the active context for the duration of the
 *   callback, so any re-entrant `engine.runCommand` call a middleware makes
 *   (the codebase's reaction/fan-out mechanism) nests automatically as a child
 *   span — no manual context threading required.
 * - Observability must never break the command path: span bookkeeping is
 *   best-effort and never throws on its own behalf.
 *
 * @packageDocumentation
 */

import {
  type Attributes,
  type Span,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

const TRACER_NAME = "manifest-runtime";

/** Attributes every Manifest command/dispatch span carries. */
export interface ManifestSpanAttributes {
  /** Acting user id. */
  actorId?: string;
  /** Command name (e.g. "create", "applyPayment"). */
  command: string;
  /** Target entity (e.g. "Event"). Omitted when not yet resolved. */
  entity?: string;
  /** Tenant the command executes for. */
  tenantId?: string;
}

function toAttributes(attrs: ManifestSpanAttributes): Attributes {
  const out: Attributes = { "manifest.command": attrs.command };
  if (attrs.entity) {
    out["manifest.entity"] = attrs.entity;
    out["manifest.operation"] = `${attrs.entity}.${attrs.command}`;
  }
  if (attrs.tenantId) {
    out["manifest.tenant_id"] = attrs.tenantId;
  }
  if (attrs.actorId) {
    out["manifest.actor_id"] = attrs.actorId;
  }
  return out;
}

/**
 * Run `fn` inside an active span named `name`, stamped with the standard
 * Manifest attributes (entity, command, tenantId, actorId). The span is made
 * the active context so nested command dispatches become child spans.
 *
 * The span is ended in all cases. A thrown error is recorded and the span
 * marked ERROR before the error re-propagates. `onResult` lets callers stamp
 * outcome attributes (success flag, emitted-event names, http status, …) from
 * the resolved value.
 */
export function withManifestSpan<T>(
  name: string,
  attrs: ManifestSpanAttributes,
  fn: (span: Span) => Promise<T>,
  onResult?: (span: Span, result: T) => void
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(
    name,
    { attributes: toAttributes(attrs) },
    async (span) => {
      try {
        const result = await fn(span);
        try {
          onResult?.(span, result);
        } catch {
          // Stamping outcome attributes must never affect the command result.
        }
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
