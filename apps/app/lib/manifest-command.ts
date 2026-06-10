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
  constraintCode: string;
  reason: string;
  authorizedBy: string;
  timestamp: number;
}

export interface ManifestUserContext {
  id: string;
  tenantId: string;
  role: string;
}

export interface RunManifestCommandParams {
  entity: string;
  command: string;
  body: Record<string, unknown>;
  /**
   * Kept for call-site compatibility/documentation. The API dispatcher
   * re-resolves the acting user from the forwarded session; this value is not
   * transmitted.
   */
  user: ManifestUserContext;
  instanceId?: string;
  overrideRequests?: ManifestOverrideRequest[];
}

export type RunManifestCommandFailureKind =
  | "unknown_command"
  | "bootstrap_failed"
  | "policy_denied"
  | "guard_failed"
  | "constraint_blocked"
  | "command_failed"
  | "runtime_error";

export interface RunManifestCommandSuccess {
  ok: true;
  entity: string;
  command: string;
  result: unknown;
  events?: unknown[];
  constraintOutcomes?: ManifestConstraintOutcome[];
  noop?: boolean;
}

export interface RunManifestCommandFailure {
  ok: false;
  entity: string;
  command: string;
  kind: RunManifestCommandFailureKind;
  httpStatus: number;
  message: string;
  policyDenial?: unknown;
  guardFailure?: unknown;
  constraintOutcomes?: ManifestConstraintOutcome[];
  error?: unknown;
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
    return {
      ok: false,
      entity,
      command,
      kind: "runtime_error",
      httpStatus: 500,
      message:
        error instanceof Error ? error.message : "Manifest API unreachable",
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
  const message =
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
  };
}
