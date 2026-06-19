/**
 * Capsule-Pro canonical HTTP transport wrapper for Manifest commands.
 *
 * Delegates execution to {@link runManifestCommandCore} and maps results to
 * JSON Response shapes. Auth must be resolved by the caller (dispatcher, etc.).
 *
 * @packageDocumentation
 */

import {
  type ManifestUserContext,
  type RunManifestCommandCoreFailure,
  type RunManifestCommandCoreParams,
  runManifestCommandCore,
} from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";
import { mapFailureToExplanation } from "@/lib/manifest/friendly-error-mapper";
import { logManifestIssue } from "@/lib/manifest/issue-log";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export type {
  ManifestUserContext,
  RunManifestCommandCoreParams as RunManifestCommandParams,
};

function logCoreFailure(
  failure: RunManifestCommandCoreFailure,
  user: ManifestUserContext
): void {
  const base = {
    entity: failure.entity,
    command: failure.command,
    httpStatus: failure.httpStatus,
    message: failure.message,
    tenantId: user.tenantId,
    userId: user.id,
    userRole: user.role,
  };

  switch (failure.kind) {
    case "unknown_command":
      logManifestIssue({ kind: "unknown_command", ...base });
      return;
    case "bootstrap_failed":
      logManifestIssue({ kind: "runtime_error", ...base });
      return;
    case "policy_denied":
      logManifestIssue({
        kind: "policy_denied",
        ...base,
        details: { policyDenial: failure.policyDenial },
      });
      return;
    case "guard_failed":
      logManifestIssue({
        kind: "guard_failed",
        ...base,
        details: { guardFailure: failure.guardFailure },
      });
      return;
    case "constraint_blocked":
      logManifestIssue({
        kind: "constraint_blocked",
        ...base,
        details: {
          constraintOutcomes: failure.constraintOutcomes,
        },
      });
      return;
    case "command_failed":
      logManifestIssue({
        kind: "command_failed",
        ...base,
        details: {
          constraintOutcomes: failure.constraintOutcomes,
        },
      });
      return;
    case "runtime_error":
      logManifestIssue({
        kind: "runtime_error",
        ...base,
        details: {
          stack:
            failure.error instanceof Error ? failure.error.stack : undefined,
        },
      });
      return;
    default:
      logManifestIssue({ kind: "runtime_error", ...base });
  }
}

/**
 * Extract structured diagnostics from a runtime failure for the error
 * response body. Carries the raw guard/policy/constraint context so devtools
 * and override dialogs can introspect the IR-level reason behind a failure.
 */
function extractDiagnostics(failure: RunManifestCommandCoreFailure): unknown[] {
  const diagnostics: unknown[] = [];
  if (failure.policyDenial) {
    diagnostics.push({ kind: "policy_denial", ...failure.policyDenial });
  }
  if (failure.guardFailure) {
    diagnostics.push({ kind: "guard_failure", ...failure.guardFailure });
  }
  if (failure.constraintOutcomes?.length) {
    for (const outcome of failure.constraintOutcomes) {
      if (!(outcome.passed || outcome.overridden)) {
        diagnostics.push({ kind: "constraint_block", ...outcome });
      }
    }
  }
  return diagnostics;
}

export async function runManifestCommand(
  params: RunManifestCommandCoreParams
): Promise<Response> {
  const result = await runManifestCommandCore(
    {
      createRuntime: ({ user, entityName }) =>
        createManifestRuntime({
          user: {
            id: user.id,
            tenantId: user.tenantId,
            role: user.role,
          },
          entityName,
        }),
    },
    params
  );

  if (!result.ok) {
    logCoreFailure(result, params.user);
    if (result.kind === "runtime_error" && result.error) {
      captureException(result.error);
    }
    // Map the technical IR-level failure into a plain-language explanation
    // with a suggested fix and a link to the blocking entity. The friendly
    // payload is forwarded in the response body under `friendlyError` so the
    // UI can surface actionable guidance instead of raw guard expressions.
    const friendlyError = mapFailureToExplanation(result, {
      body: params.body,
      instanceId: params.instanceId,
    });
    return manifestErrorResponse(
      {
        error: result.message,
        message: result.message,
        kind: result.kind,
        friendlyError,
        diagnostics: extractDiagnostics(result),
      },
      result.httpStatus
    );
  }

  // Fire-and-forget webhook dispatch (matches legacy handler behavior).
  // Skip on a no-op: nothing changed, so we must not emit a spurious
  // "updated" webhook for an already-completed idempotent action.
  const resultData = result.result as Record<string, unknown> | undefined;
  const entityId = String(resultData?.id ?? params.body?.id ?? "");
  if (resultData?.id && !result.noop) {
    const webhookAction =
      params.command === "create"
        ? ("created" as const)
        : params.command === "delete" ||
            params.command === "softDelete" ||
            params.command === "cancel"
          ? ("deleted" as const)
          : ("updated" as const);
    dispatchWebhooks({
      tenantId: params.user.tenantId,
      entityType: params.entity,
      entityId,
      action: webhookAction,
      data: {
        ...(resultData ?? {}),
        commandName: params.command,
      },
    }).catch(() => {});
  }

  return manifestSuccessResponse({
    result: result.result,
    events: result.events,
  });
}

/** Canonical alias for audit-routes tooling compliance. Identical to runManifestCommand. */
export const runCommand = runManifestCommand;
