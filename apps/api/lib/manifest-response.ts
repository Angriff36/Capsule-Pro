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
 * Normalize a CommandResult into a structured shape for generated dispatcher routes.
 *
 * The Manifest projection generator emits calls to this function in universal
 * dispatcher snapshots. It extracts the data, events, and diagnostic information
 * from a raw CommandResult into a flat object the route handler can branch on.
 */
export function normalizeCommandResult(
  _entity: string,
  _command: string,
  result: CommandResult,
): {
  success: boolean;
  data?: unknown;
  error: string;
  events?: CommandResult["emittedEvents"];
  diagnostics?: Array<{ kind: string; message: string }>;
} {
  const toDiagnostic = (kind: string, message: string | undefined, fallback: string) => ({
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
        .map((o) => toDiagnostic("constraint_block", o.formatted ?? o.message, "Constraint failed")),
    };
  }

  // Map failure mode to a diagnostic kind
  const diagnostics: Array<{ kind: string; message: string }> = [];
  if (result.policyDenial) {
    diagnostics.push(toDiagnostic("policy_denial", result.policyDenial.formatted, "Policy denied"));
  }
  if (result.guardFailure) {
    diagnostics.push(toDiagnostic("guard_failure", result.guardFailure.formatted, "Guard failed"));
  }
  if (result.concurrencyConflict) {
    diagnostics.push(toDiagnostic("concurrency_conflict", result.concurrencyConflict.conflictCode, "Conflict"));
  }
  for (const outcome of result.constraintOutcomes?.filter((o) => !o.passed) ?? []) {
    diagnostics.push(toDiagnostic("constraint_block", outcome.formatted ?? outcome.message, "Constraint failed"));
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
  message: string | { error: string; diagnostics?: unknown[] },
  status: number
): Response {
  const body =
    typeof message === "string"
      ? { success: false, message }
      : { success: false, error: message.error, diagnostics: message.diagnostics ?? [] };
  return NextResponse.json(body, { status });
}
