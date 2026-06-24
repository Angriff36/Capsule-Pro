import { database } from "@repo/database";
import {
  type ManifestUserContext,
  type RunManifestCommandCoreDeps,
  type RunManifestCommandCoreFailure,
  type RunManifestCommandCoreParams,
  runManifestCommandCore,
} from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";
import { recordManifestCommandActivity } from "@/app/lib/activity-feed-service";
import { mapFailureToExplanation } from "@/lib/manifest/friendly-error-mapper";
import { logManifestIssue } from "@/lib/manifest/issue-log";
import {
  locationForKey,
  resolveFailureSourceLocation,
} from "@/lib/manifest/source-location";
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
  // Policy/guard failures point at the command (their authoring scope); a
  // blocked constraint points at the named constraint itself, falling back to
  // the command. This annotates each violation with its DSL source location so
  // devtools/override dialogs can deep-link to the `.manifest` rule.
  const commandLocation =
    locationForKey(`command:${failure.entity}.${failure.command}`) ??
    locationForKey(`entity:${failure.entity}`);

  if (failure.policyDenial) {
    diagnostics.push({
      kind: "policy_denial",
      ...failure.policyDenial,
      sourceLocation: commandLocation,
    });
  }
  if (failure.guardFailure) {
    diagnostics.push({
      kind: "guard_failure",
      ...failure.guardFailure,
      sourceLocation: commandLocation,
    });
  }
  if (failure.constraintOutcomes?.length) {
    for (const outcome of failure.constraintOutcomes) {
      if (!(outcome.passed || outcome.overridden)) {
        const constraintName = outcome.constraintName ?? outcome.code;
        const constraintLocation = constraintName
          ? locationForKey(`constraint:${failure.entity}.${constraintName}`)
          : undefined;
        diagnostics.push({
          kind: "constraint_block",
          ...outcome,
          sourceLocation: constraintLocation ?? commandLocation,
        });
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
    // Annotate the failure with the `.manifest` source location of the rule
    // that fired (blocked constraint → command → entity) so an IR-level error
    // links straight back to its DSL declaration.
    const sourceLocation = resolveFailureSourceLocation(result);
    return manifestErrorResponse(
      {
        error: result.message,
        message: result.message,
        kind: result.kind,
        friendlyError,
        diagnostics: extractDiagnostics(result),
        sourceLocation,
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

    recordManifestCommandActivity(
      params.user.tenantId,
      params.entity,
      entityId,
      params.command,
      resultData ?? {},
      params.user.id,
      typeof params.body?.correlationId === "string"
        ? params.body.correlationId
        : undefined
    );
  }

  return manifestSuccessResponse({
    result: result.result,
    events: result.events,
  });
}

/** Canonical alias for audit-routes tooling compliance. Identical to runManifestCommand. */
export const runCommand = runManifestCommand;

/** Maximum operations per batch. Override with MANIFEST_BATCH_MAX_SIZE. */
export const MAX_BATCH_SIZE = Number(process.env.MANIFEST_BATCH_MAX_SIZE) || 50;

/** One operation in a batch: an entity command plus its input params. */
export interface ManifestBatchOperation {
  command: string;
  entity: string;
  params?: Record<string, unknown>;
}

export interface RunManifestBatchParams {
  operations: ManifestBatchOperation[];
  user: ManifestUserContext;
}

/** Internal: carries the failing op's index + core failure out of the tx so it rolls back. */
class BatchOperationError extends Error {
  readonly failure: RunManifestCommandCoreFailure;
  readonly index: number;
  constructor(index: number, failure: RunManifestCommandCoreFailure) {
    super(failure.message);
    this.name = "BatchOperationError";
    this.index = index;
    this.failure = failure;
  }
}

/**
 * Execute an ordered array of governed commands sequentially inside a SINGLE
 * database transaction. Every operation runs through {@link runManifestCommandCore}
 * against one tx-bound runtime, so all writes commit together or — on the first
 * failure — roll back as a unit (constitution §5 canonical write path).
 *
 * Returns one result per operation on success; on any failure returns the
 * single-command error shape annotated with the failing operation's index.
 */
export async function runManifestBatch(
  params: RunManifestBatchParams
): Promise<Response> {
  const { operations, user } = params;

  if (!Array.isArray(operations) || operations.length === 0) {
    return manifestErrorResponse(
      "Batch requires a non-empty `operations` array",
      400
    );
  }
  if (operations.length > MAX_BATCH_SIZE) {
    return manifestErrorResponse(
      `Batch size ${operations.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
      400
    );
  }
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (
      !op ||
      typeof op.entity !== "string" ||
      typeof op.command !== "string"
    ) {
      return manifestErrorResponse(
        `Operation at index ${i} must include string \`entity\` and \`command\``,
        400
      );
    }
  }

  try {
    const results = await database.$transaction(
      async (tx) => {
        // One tx-bound runtime shared by every operation: all governed writes
        // land in this transaction and roll back together on any failure.
        const runtime = await createManifestRuntime({
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
          prismaOverride: tx,
        });
        const deps: RunManifestCommandCoreDeps = {
          createRuntime: () => Promise.resolve(runtime),
        };

        const out: Array<{ events: unknown; noop?: boolean; result: unknown }> =
          [];
        for (let i = 0; i < operations.length; i++) {
          const op = operations[i];
          const result = await runManifestCommandCore(deps, {
            entity: op.entity,
            command: op.command,
            body: op.params ?? {},
            user,
          });
          if (!result.ok) {
            logCoreFailure(result, user);
            // Throw to abort the transaction — partial writes are discarded.
            throw new BatchOperationError(i, result);
          }
          out.push({
            result: result.result,
            events: result.events,
            noop: result.noop,
          });
        }
        return out;
      },
      // Prisma interactive transactions default to a 5s timeout; a full batch of
      // governed commands (each running guards/constraints/reactions) can exceed
      // that. Scale with batch size, capped at 120s.
      {
        timeout: Math.min(operations.length * 2000 + 5000, 120_000),
        maxWait: 10_000,
      }
    );

    return manifestSuccessResponse({ results });
  } catch (error) {
    if (error instanceof BatchOperationError) {
      const { failure, index } = error;
      if (failure.kind === "runtime_error" && failure.error) {
        captureException(failure.error);
      }
      const friendlyError = mapFailureToExplanation(failure, {
        body: operations[index]?.params ?? {},
      });
      const sourceLocation = resolveFailureSourceLocation(failure);
      return manifestErrorResponse(
        {
          error: `Operation ${index} (${failure.entity}.${failure.command}) failed; the batch was rolled back: ${failure.message}`,
          message: failure.message,
          kind: failure.kind,
          friendlyError,
          diagnostics: extractDiagnostics(failure),
          sourceLocation,
        },
        failure.httpStatus
      );
    }
    captureException(error);
    return manifestErrorResponse("Batch execution failed", 500);
  }
}
