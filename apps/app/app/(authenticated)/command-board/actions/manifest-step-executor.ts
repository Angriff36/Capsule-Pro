"use server";

/**
 * Manifest Step Executor — Embedded Runtime Helper for Plan Approval.
 *
 * This is the ONLY way domain mutations should happen from plan approval.
 * Uses the embedded runtime pattern (same process, same auth context,
 * no HTTP round-trip, no cookie propagation issues).
 *
 * All domain steps in `executeDomainStep()` delegate here, which in turn
 * calls `runtime.runCommand()` via the shared factory in
 * `@repo/manifest-adapters/manifest-runtime-factory`.
 *
 * Idempotency: Each step gets a stable key `plan:{planId}:step:{stepId}`.
 * Same plan + same step = same key on retry → dedup works.
 *
 * Failure caching: Failed results expire after 30 s (via `failureTtlMs`)
 * so transient errors don't permanently block retries.
 *
 * @packageDocumentation
 */

import type { CommandResult } from "@angriff36/manifest";
import { database } from "@repo/database";
import { createManifestRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ManifestStepResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  emittedEvents?: unknown[];
}

export interface ManifestStepOpts {
  userId: string;
  tenantId: string;
  planId: string;
  stepId: string;
}

// ---------------------------------------------------------------------------
// Failure TTL for plan step idempotency (30 seconds)
// ---------------------------------------------------------------------------

const PLAN_STEP_FAILURE_TTL_MS = 30_000;

// ---------------------------------------------------------------------------
// Minimal logger / error capture for the shared factory
// ---------------------------------------------------------------------------

const minimalLog = {
  info: (message: string, meta?: Record<string, unknown>) => {
    // Server actions use console — no structured logger available here.
    if (process.env.NODE_ENV === "development") {
      console.info(`[manifest-step-executor] ${message}`, meta ?? "");
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`[manifest-step-executor] ${message}`, meta ?? "");
  },
};

const minimalCaptureException = (err: unknown) => {
  console.error("[manifest-step-executor] Uncaught exception:", err);
};

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

/**
 * Execute a domain step via the manifest runtime (embedded pattern).
 *
 * This is the ONLY way domain mutations should happen from plan approval.
 * Uses the embedded runtime pattern — same process, same auth context,
 * no HTTP round-trip, no cookie propagation issues.
 *
 * @param entityName - Manifest entity name (e.g. "Event", "PrepTask")
 * @param commandName - Command to execute (e.g. "create", "update", "adjust")
 * @param args - Command arguments (entity-specific)
 * @param opts - Auth context + plan/step IDs for idempotency
 *
 * @example
 * ```typescript
 * const result = await executeDomainStepViaManifest(
 *   "Event",
 *   "create",
 *   { title: "AI Planned Event", eventType: "catering", guestCount: 50 },
 *   { userId, tenantId, planId, stepId: step.stepId },
 * );
 * ```
 */
export async function executeDomainStepViaManifest(
  entityName: string,
  commandName: string,
  args: Record<string, unknown>,
  opts: ManifestStepOpts
): Promise<ManifestStepResult> {
  // Fail closed: refuse to execute without auth context.
  if (!opts.userId) {
    return {
      success: false,
      message: "Missing userId",
      error:
        "Auth context incomplete — cannot execute manifest command without userId",
    };
  }
  if (!opts.tenantId) {
    return {
      success: false,
      message: "Missing tenantId",
      error:
        "Auth context incomplete — cannot execute manifest command without tenantId",
    };
  }

  if (!opts.planId) {
    return {
      success: false,
      message: "Missing planId",
      error:
        "Plan context incomplete — cannot generate stable idempotency key without planId",
    };
  }
  if (!opts.stepId) {
    return {
      success: false,
      message: "Missing stepId",
      error:
        "Plan context incomplete — cannot generate stable idempotency key without stepId",
    };
  }

  try {
    // Uses @repo/manifest-adapters (shared package), NOT apps/api/lib/manifest-runtime.
    // The shared factory handles store provider routing, outbox wiring, and
    // idempotency store creation.
    const runtime = await createManifestRuntime(
      {
        prisma: database,
        log: minimalLog,
        captureException: minimalCaptureException,
        idempotency: { failureTtlMs: PLAN_STEP_FAILURE_TTL_MS },
      },
      {
        user: { id: opts.userId, tenantId: opts.tenantId },
        entityName,
      }
    );

    // Stable idempotency key: planId + stepId = same logical action.
    // If the same plan retries the same step, the key is identical → dedup works.
    const idempotencyKey = `plan:${opts.planId}:step:${opts.stepId}`;

    const result: CommandResult = await runtime.runCommand(commandName, args, {
      entityName,
      idempotencyKey,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error ?? `${entityName}.${commandName} failed`,
        error: formatCommandError(result, entityName, commandName),
      };
    }

    return {
      success: true,
      message: `${entityName}.${commandName} executed via manifest`,
      data: result.result,
      emittedEvents: result.emittedEvents,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during manifest step";
    console.error(
      `[manifest-step-executor] ${entityName}.${commandName} threw:`,
      err
    );
    return {
      success: false,
      message: `${entityName}.${commandName} threw an exception`,
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format a failed CommandResult into a human-readable error string.
 * Prioritises policy denials > guard failures > generic error.
 */
function formatCommandError(
  result: CommandResult,
  entityName: string,
  commandName: string
): string {
  if (result.policyDenial) {
    return `Access denied: ${result.policyDenial.policyName} — ${result.policyDenial.formatted ?? result.policyDenial.message ?? "policy check failed"}`;
  }
  if (result.guardFailure) {
    return `Guard failed: ${result.guardFailure.formatted}`;
  }
  return (
    result.error ?? `${entityName}.${commandName} failed with unknown error`
  );
}
