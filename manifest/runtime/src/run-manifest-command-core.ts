/**
 * Canonical Manifest command execution (transport-agnostic).
 *
 * Shared by the API HTTP wrapper and app server actions. Callers supply auth
 * context and a runtime factory; this module resolves commands and invokes
 * RuntimeEngine.runCommand.
 */

import type { EmittedEvent, RuntimeEngine } from "@angriff36/manifest";
import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import { resolveCommand } from "./command-resolver";

export interface ManifestUserContext {
  id: string;
  tenantId: string;
  role: string;
}

export interface RunManifestCommandCoreParams {
  entity: string;
  command: string;
  body: Record<string, unknown>;
  user: ManifestUserContext;
  instanceId?: string;
}

export interface RunManifestCommandCoreDeps {
  createRuntime: (ctx: {
    user: ManifestUserContext;
    entityName: string;
  }) => Promise<RuntimeEngine>;
}

export type RunManifestCommandFailureKind =
  | "unknown_command"
  | "bootstrap_failed"
  | "policy_denied"
  | "guard_failed"
  | "constraint_blocked"
  | "command_failed"
  | "runtime_error";

export interface RunManifestCommandCoreSuccess {
  ok: true;
  entity: string;
  command: string;
  result: unknown;
  events?: EmittedEvent[];
  constraintOutcomes?: ConstraintOutcome[];
}

export interface RunManifestCommandCoreFailure {
  ok: false;
  entity: string;
  command: string;
  kind: RunManifestCommandFailureKind;
  httpStatus: number;
  message: string;
  policyDenial?: unknown;
  guardFailure?: unknown;
  constraintOutcomes?: ConstraintOutcome[];
  error?: unknown;
}

export type RunManifestCommandCoreResult =
  | RunManifestCommandCoreSuccess
  | RunManifestCommandCoreFailure;

export async function runManifestCommandCore(
  deps: RunManifestCommandCoreDeps,
  params: RunManifestCommandCoreParams
): Promise<RunManifestCommandCoreResult> {
  const { entity, command: commandSlug, body, user, instanceId } = params;

  try {
    const resolved = resolveCommand(entity, commandSlug);
    if (!resolved) {
      return {
        ok: false,
        entity,
        command: commandSlug,
        kind: "unknown_command",
        httpStatus: 404,
        message: `Unknown command: ${entity}.${commandSlug}. Verify the entity and command names against the manifest IR.`,
      };
    }

    const command = resolved.command;
    const runtime = await deps.createRuntime({ user, entityName: entity });

    // For `create` with no caller-supplied instance, let the engine auto-create:
    // @angriff36/manifest >=1.7 detects `commandName === "create" && entityName &&
    // !instanceId` and persists a constraint-validated instance from the command
    // body BEFORE running the command's mutate actions (runtime-engine
    // `shouldAutoCreateInstance`). Passing an instanceId here would DISABLE that
    // path, so we omit it for create and let the engine own instantiation.
    const result = await runtime.runCommand(command, body, {
      entityName: entity,
      ...(instanceId ? { instanceId } : {}),
    });

    if (!result.success) {
      if (result.policyDenial) {
        return {
          ok: false,
          entity,
          command,
          kind: "policy_denied",
          httpStatus: 403,
          message: `Access denied: ${result.policyDenial.policyName} (role=${user.role})`,
          policyDenial: result.policyDenial,
        };
      }
      if (result.guardFailure) {
        return {
          ok: false,
          entity,
          command,
          kind: "guard_failed",
          httpStatus: 422,
          message: `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          guardFailure: result.guardFailure,
        };
      }

      const blockedConstraint = result.constraintOutcomes?.find(
        (outcome) =>
          !outcome.passed &&
          !outcome.overridden &&
          outcome.severity === "block"
      );
      if (blockedConstraint) {
        return {
          ok: false,
          entity,
          command,
          kind: "constraint_blocked",
          httpStatus: 422,
          message:
            blockedConstraint.message ??
            result.error ??
            "Constraint blocked command",
          constraintOutcomes: result.constraintOutcomes,
        };
      }

      return {
        ok: false,
        entity,
        command,
        kind: "command_failed",
        httpStatus: 400,
        message: result.error ?? "Command failed",
        constraintOutcomes: result.constraintOutcomes,
      };
    }

    // For create, the engine returns the auto-created instance as `result.result`
    // (>=1.7). If a create result ever lacks a top-level id, fall back to the
    // explicitly-supplied instanceId so callers still receive `{ id }`.
    let successResult: unknown = result.result;
    if (
      command === "create" &&
      instanceId &&
      !(
        typeof successResult === "object" &&
        successResult !== null &&
        typeof (successResult as Record<string, unknown>).id === "string"
      )
    ) {
      successResult = { id: instanceId };
    }

    return {
      ok: true,
      entity,
      command,
      result: successResult,
      events: result.emittedEvents,
      constraintOutcomes: result.constraintOutcomes,
    };
  } catch (error) {
    return {
      ok: false,
      entity,
      command: commandSlug,
      kind: "runtime_error",
      httpStatus: 500,
      message: error instanceof Error ? error.message : "Internal server error",
      error,
    };
  }
}
