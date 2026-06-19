/**
 * Manifest command execution for app server actions.
 *
 * apps/app does not execute Manifest directly (architecture contract:
 * docs/manifest-architecture-contract.md). This module forwards governed
 * commands over HTTP to the apps/api dispatcher
 * `/api/manifest/[entity]/commands/[command]`, which owns runtime creation,
 * auth context, response normalization, and telemetry. The caller's Clerk
 * session cookies are forwarded so apps/api resolves the same user.
 */

import type { ConstraintOutcome } from "@repo/design-system/components/constraint-override-dialog";
import { apiPostJsonServer } from "@/app/lib/api-server";

/**
 * UI-safe constraint outcome DTO. Aliases the design-system type so command
 * results plug directly into ConstraintOverrideDialog without conversion.
 */
export type ManifestConstraintOutcome = ConstraintOutcome;

/** Structural mirror of the Manifest OverrideRequest input. */
export interface ManifestOverrideRequest {
  authorizedBy: string;
  constraintCode: string;
  reason: string;
  timestamp: number;
}

export interface ManifestUserContext {
  id: string;
  role: string;
  tenantId: string;
}

export interface RunManifestCommandParams {
  body: Record<string, unknown>;
  command: string;
  entity: string;
  instanceId?: string;
  overrideRequests?: ManifestOverrideRequest[];
  /**
   * Kept for call-site compatibility/documentation. The API dispatcher
   * re-resolves the acting user from the forwarded session; this value is not
   * transmitted.
   */
  user: ManifestUserContext;
}

export type RunManifestCommandFailureKind =
  | "unknown_command"
  | "bootstrap_failed"
  | "policy_denied"
  | "guard_failed"
  | "constraint_blocked"
  | "command_failed"
  | "runtime_error";

/**
 * Plain-language explanation of a command failure, produced server-side by
 * the friendly-error-mapper and forwarded verbatim on the response body.
 * Non-technical users see `title`/`message`/`suggestedFix`; the
 * `blockingEntity.link` is a deep link to the entity that blocked the action.
 */
export interface FriendlyError {
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

export interface RunManifestCommandSuccess {
  command: string;
  constraintOutcomes?: ManifestConstraintOutcome[];
  entity: string;
  events?: unknown[];
  noop?: boolean;
  ok: true;
  result: unknown;
}

export interface RunManifestCommandFailure {
  command: string;
  constraintOutcomes?: ManifestConstraintOutcome[];
  entity: string;
  error?: unknown;
  /** Plain-language explanation (server-mapped). Forwarded to UI layers. */
  friendlyError?: FriendlyError;
  guardFailure?: unknown;
  httpStatus: number;
  kind: RunManifestCommandFailureKind;
  message: string;
  ok: false;
  policyDenial?: unknown;
}

export type RunManifestCommandResult =
  | RunManifestCommandSuccess
  | RunManifestCommandFailure;

const KNOWN_FAILURE_KINDS: ReadonlySet<string> = new Set([
  "unknown_command",
  "bootstrap_failed",
  "policy_denied",
  "guard_failed",
  "constraint_blocked",
  "command_failed",
  "runtime_error",
]);

function failureKindForStatus(status: number): RunManifestCommandFailureKind {
  if (status === 404) {
    return "unknown_command";
  }
  if (status === 403) {
    return "policy_denied";
  }
  if (status === 400 || status === 422) {
    return "command_failed";
  }
  return "runtime_error";
}

/**
 * Execute a governed Manifest command from a server action by calling the
 * apps/api dispatcher. Returns a structured result (not an HTTP Response).
 * On failure, inspect `kind`, `message`, and `constraintOutcomes` for UI
 * handling.
 */
export async function runManifestCommand(
  params: RunManifestCommandParams
): Promise<RunManifestCommandResult> {
  const { entity, command, instanceId, overrideRequests } = params;

  const body: Record<string, unknown> = { ...params.body };
  if (instanceId && body.id === undefined) {
    body.id = instanceId;
  }
  if (overrideRequests && overrideRequests.length > 0) {
    // Reserved key extracted by runManifestCommandCore before the engine runs.
    body.overrideRequests = overrideRequests;
  }

  let response: Response;
  try {
    response = await apiPostJsonServer(
      `/api/manifest/${entity}/commands/${command}`,
      body
    );
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      entity,
      command,
      kind: "runtime_error",
      httpStatus: 500,
      message: isTimeout
        ? "The API server did not respond in time (port 2223). Restart apps/api and try again."
        : error instanceof Error
          ? error.message
          : "Manifest API unreachable",
      error,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok || payload?.success !== true) {
    return buildFailure(entity, command, response.status, payload);
  }

  return {
    ok: true,
    entity,
    command,
    result: payload.result,
    ...(Array.isArray(payload.events) ? { events: payload.events } : {}),
    ...(payload.constraintOutcomes
      ? {
          constraintOutcomes:
            payload.constraintOutcomes as ManifestConstraintOutcome[],
        }
      : {}),
    ...(payload.noop === true ? { noop: true } : {}),
  };
}

function buildFailure(
  entity: string,
  command: string,
  httpStatus: number,
  payload: Record<string, unknown> | null
): RunManifestCommandFailure {
  const kind =
    typeof payload?.kind === "string" && KNOWN_FAILURE_KINDS.has(payload.kind)
      ? (payload.kind as RunManifestCommandFailureKind)
      : failureKindForStatus(httpStatus);
  const friendly = payload?.friendlyError as FriendlyError | undefined;
  // Prefer the server's plain-language explanation so server-action call sites
  // that surface `result.message` show the friendly text without per-site
  // changes. The full `friendlyError` object is still forwarded for richer UIs.
  const message =
    friendly?.message ||
    (typeof payload?.error === "string" && payload.error) ||
    (typeof payload?.message === "string" && payload.message) ||
    `Manifest command failed (${httpStatus})`;
  return {
    ok: false,
    entity,
    command,
    kind,
    httpStatus,
    message,
    ...(payload?.constraintOutcomes
      ? {
          constraintOutcomes:
            payload.constraintOutcomes as ManifestConstraintOutcome[],
        }
      : {}),
    ...(payload?.guardFailure ? { guardFailure: payload.guardFailure } : {}),
    ...(payload?.policyDenial ? { policyDenial: payload.policyDenial } : {}),
    ...(friendly ? { friendlyError: friendly } : {}),
  };
}
