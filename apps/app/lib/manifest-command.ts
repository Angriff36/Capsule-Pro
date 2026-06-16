/**
 * Manifest command execution for app server actions — Convex compile path.
 */

import type { ConstraintOutcome } from "@repo/design-system/components/constraint-override-dialog";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runConvexMutation } from "@/app/lib/convex/command-bridge-server";

export type ManifestConstraintOutcome = ConstraintOutcome;

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

function failureKindForMessage(message: string): RunManifestCommandFailureKind {
  const lower = message.toLowerCase();
  if (lower.includes("not found") || lower.includes("unknown")) {
    return "unknown_command";
  }
  if (lower.includes("policy") || lower.includes("permission") || lower.includes("denied")) {
    return "policy_denied";
  }
  if (lower.includes("guard")) {
    return "guard_failed";
  }
  if (lower.includes("constraint")) {
    return "constraint_blocked";
  }
  return "command_failed";
}

/**
 * Execute a governed command via generated Convex mutation.
 */
export async function runManifestCommand(
  params: RunManifestCommandParams
): Promise<RunManifestCommandResult> {
  const { entity, command, instanceId, overrideRequests, body: rawBody } = params;

  await requireCurrentUser();

  const body: Record<string, unknown> = { ...rawBody };
  if (instanceId && body.id === undefined) {
    body.id = instanceId;
  }
  if (overrideRequests && overrideRequests.length > 0) {
    body.overrideRequests = overrideRequests;
  }

  try {
    const result = await runConvexMutation(entity, command, body);
    return {
      ok: true,
      entity,
      command,
      result,
      events: [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Convex mutation failed";
    return {
      ok: false,
      entity,
      command,
      kind: failureKindForMessage(message),
      httpStatus: 400,
      message,
      error,
    };
  }
}
