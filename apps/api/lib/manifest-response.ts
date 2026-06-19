/**
 * Response helpers for generated command handlers.
 *
 * Wraps the kitchen-ops api-response utilities into the simple
 * `manifestSuccessResponse` / `manifestErrorResponse` interface
 * that the generated handlers call.
 */

import type { CommandResult } from "@angriff36/manifest";
import { NextResponse } from "next/server";

/**
 * Failure kind surfaced on every non-success command response so the client
 * can branch without inferring from HTTP status. Mirrors
 * `RunManifestCommandFailureKind` from the runtime core.
 */
export type ManifestFailureKind =
  | "unknown_command"
  | "bootstrap_failed"
  | "policy_denied"
  | "guard_failed"
  | "constraint_blocked"
  | "command_failed"
  | "runtime_error";

/**
 * Structured failure detail included in error responses so non-technical users
 * get a plain-language explanation, a suggested fix, and (when resolvable) a
 * direct link to the blocking entity. Produced by `friendly-error-mapper.ts`.
 */
export interface FriendlyErrorPayload {
  blockingEntity?: {
    type: string;
    id?: string;
    label: string;
    link?: string;
    reason?: string;
  };
  category:
    | "wrong_status"
    | "validation"
    | "permission"
    | "not_found"
    | "conflict"
    | "system";
  message: string;
  severity: "info" | "warning" | "error";
  suggestedFix?: string;
  title: string;
}

/** Input for the structured (object) form of `manifestErrorResponse`. */
export interface ManifestErrorPayload {
  /** Resolved constraint / guard diagnostics (devtools + override dialogs). */
  diagnostics?: unknown[];
  /** Technical/IR-level error message (kept for engineers + backwards compat). */
  error: string;
  /** Human-friendly explanation payload (shown prominently in the UI). */
  friendlyError?: FriendlyErrorPayload;
  /** Runtime failure kind (`guard_failed`, `policy_denied`, ...). */
  kind?: string;
  /** Original authoring message for backwards compat with the string overload. */
  message?: string;
}

/**
 * Normalize a CommandResult into a structured shape for generated dispatcher routes.
 *
 * The Manifest projection generator emits calls to this function in universal
 * dispatcher snapshots. It extracts the data, events, and diagnostic information
 * from a raw CommandResult into a flat object the route handler can branch on.
 */
export function normalizeCommandResult(
  _entity: string,
  _command: string,
  result: CommandResult
): {
  success: boolean;
  data?: unknown;
  error: string;
  events?: CommandResult["emittedEvents"];
  diagnostics?: Array<{ kind: string; message: string }>;
} {
  const toDiagnostic = (
    kind: string,
    message: string | undefined,
    fallback: string
  ) => ({
    kind,
    message: message ?? fallback,
  });

  if (result.success) {
    return {
      success: true,
      data: result.result ?? result.instance,
      error: "",
      events: result.emittedEvents,
      diagnostics: result.constraintOutcomes
        ?.filter((o) => !o.passed)
        .map((o) =>
          toDiagnostic(
            "constraint_block",
            o.formatted ?? o.message,
            "Constraint failed"
          )
        ),
    };
  }

  // Map failure mode to a diagnostic kind
  const diagnostics: Array<{ kind: string; message: string }> = [];
  if (result.policyDenial) {
    diagnostics.push(
      toDiagnostic(
        "policy_denial",
        result.policyDenial.formatted,
        "Policy denied"
      )
    );
  }
  if (result.guardFailure) {
    diagnostics.push(
      toDiagnostic(
        "guard_failure",
        result.guardFailure.formatted,
        "Guard failed"
      )
    );
  }
  if (result.concurrencyConflict) {
    diagnostics.push(
      toDiagnostic(
        "concurrency_conflict",
        result.concurrencyConflict.conflictCode,
        "Conflict"
      )
    );
  }
  for (const outcome of result.constraintOutcomes?.filter((o) => !o.passed) ??
    []) {
    diagnostics.push(
      toDiagnostic(
        "constraint_block",
        outcome.formatted ?? outcome.message,
        "Constraint failed"
      )
    );
  }

  return {
    success: false,
    error: result.error ?? "Command failed",
    events: result.emittedEvents,
    diagnostics,
  };
}

export function manifestSuccessResponse(data: unknown, status = 200): Response {
  return NextResponse.json(
    {
      success: true,
      ...(typeof data === "object" && data !== null ? data : { data }),
    },
    { status }
  );
}

export function manifestErrorResponse(
  message: string | ManifestErrorPayload,
  status: number
): Response {
  if (typeof message === "string") {
    return NextResponse.json({ success: false, message }, { status });
  }
  const body: Record<string, unknown> = {
    success: false,
    error: message.error,
    // Backwards compat: many older callers read `message` rather than `error`.
    message: message.message ?? message.error,
    diagnostics: message.diagnostics ?? [],
  };
  if (message.kind) {
    body.kind = message.kind;
  }
  if (message.friendlyError) {
    body.friendlyError = message.friendlyError;
  }
  return NextResponse.json(body, { status });
}
