import type { CommandResult } from "@angriff36/manifest";
import { RuntimeEngine } from "@angriff36/manifest";
import type { IRCommand, OverrideRequest } from "@angriff36/manifest/ir";
import {
  refreshParentContext,
  resolveParentContext,
} from "./parent-context-resolver";
import { sanitizeCreateInitialTransitionInput } from "./run-manifest-command-core";

// Re-export the canonical deterministic expression builtins
// (percent/daysBetween/containsAny/…) from this DB-free module so test runtimes
// can wire the SAME builtins the production factory injects, WITHOUT importing
// the package index (which pulls in prisma-store/DATABASE_URL side effects).
// Single source of truth — see manifest-builtins.ts. The factory still imports
// createCustomBuiltins directly from manifest-builtins.ts.
export { createCustomBuiltins } from "./manifest-builtins";

// ---------------------------------------------------------------------------
// Telemetry hook shape (mirrors ManifestTelemetryHooks from the factory,
// kept minimal to avoid importing from manifest-runtime-factory and creating
// a circular dependency).
// ---------------------------------------------------------------------------

/** @internal Subset of ManifestTelemetryHooks relevant to this module. */
interface TelemetryHooks {
  onCommandExecuted?(
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ): void | Promise<void>;
}

/** @internal Shape of the context keys the factory injects. */
interface ContextWithTelemetry {
  telemetry?: TelemetryHooks;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Options type matching the base RuntimeEngine.runCommand signature.
// ---------------------------------------------------------------------------

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
  overrideRequests?: OverrideRequest[];
}

/**
 * Extended runtime engine used by `@repo/manifest-runtime`.
 *
 * Two responsibilities beyond the base class:
 *
 * 1. **Command lookup fallback** — when the compiler IR omits the `entity`
 *    field on a command, this class patches it in so that entity-scoped
 *    lookups still resolve.
 *
 * 2. **Telemetry hook invocation** — after every successful `runCommand`
 *    that emits at least one event, the `onCommandExecuted` telemetry hook
 *    (injected via context by `manifest-runtime-factory`) is called.  This
 *    is the bridge that makes the factory's outbox-write logic fire.
 */
export class ManifestRuntimeEngine extends RuntimeEngine {
  // ---- runCommand override (new) -----------------------------------------

  override async runCommand(
    commandName: string,
    input: Record<string, unknown>,
    options: RunCommandOptions = {}
  ): Promise<CommandResult> {
    const entityName = options.entityName;
    const body = input;

    if (entityName && commandName === "create") {
      try {
        await resolveParentContext(this, {
          entity: entityName,
          command: commandName,
          body,
        });
      } catch {
        // Inference is best-effort.
      }
      sanitizeCreateInitialTransitionInput(this, entityName, commandName, body);
    }

    const instanceId =
      commandName === "create"
        ? options.instanceId
        : (options.instanceId ??
          (typeof body.id === "string" && body.id.length > 0
            ? body.id
            : undefined));

    if (entityName && commandName === "syncFromEvent" && instanceId) {
      try {
        await refreshParentContext(this, {
          entity: entityName,
          command: commandName,
          body,
          instanceId,
        });
      } catch {
        // Refresh is best-effort.
      }
    }

    const result = await super.runCommand(commandName, input, options);

    // R4 — Surface command failures so silently-swallowed reaction failures
    // (e.g. BattleBoard.create triggered by EventCreated reaction) appear in
    // api logs instead of vanishing. Non-throwing; best-effort structured log.
    if (!result.success) {
      try {
        const err =
          (result as unknown as { error?: unknown }).error ??
          (result as unknown as { message?: unknown }).message ??
          "unknown error";
        const guard = (
          result as unknown as { guardFailure?: { formatted?: string } }
        ).guardFailure;
        const detail = guard?.formatted ?? String(err);
        console.error(
          `[manifest-runtime] command failed: ${options.entityName ?? "??"}.${commandName} — ${detail}`
        );
      } catch {
        // Defensive: never let logging crash the call path.
      }
    }

    // Fire the telemetry hook only when there is something to report.
    if (
      result.success &&
      result.emittedEvents &&
      result.emittedEvents.length > 0
    ) {
      const ctx = this.getContext() as ContextWithTelemetry;
      const hook = ctx.telemetry?.onCommandExecuted;
      if (hook) {
        const irCommand = this.getCommand(commandName, options.entityName);
        if (irCommand) {
          await hook(irCommand, result, options.entityName);
        }
      }
    }

    return result;
  }
}
