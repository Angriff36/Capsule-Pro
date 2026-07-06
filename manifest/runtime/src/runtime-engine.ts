import type { CommandResult } from "@angriff36/manifest";
import { RuntimeEngine } from "@angriff36/manifest";
import type { IRCommand, OverrideRequest } from "@angriff36/manifest/ir";
import { withManifestSpan } from "./command-tracing";
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

/**
 * Information passed to the `onCommandSettled` observability hook, which fires
 * after EVERY `runCommand` (success or failure) — unlike `onCommandExecuted`,
 * which only fires on success with emitted events. This is the seam that feeds
 * the append-only reaction-execution log (constitution §11 operational log).
 */
export interface CommandSettledInfo {
  /** Causation id linking this command to its trigger. */
  causationId?: string;
  /** Command name (e.g. "create", "applyPayment"). */
  commandName: string;
  /** Correlation id grouping a propagation cascade. */
  correlationId?: string;
  /** Wall-clock execution time in milliseconds. */
  durationMs: number;
  /** Entity the command targets, when known. */
  entityName?: string;
  /** Raw command input (used for payload-shape capture; keys only are logged). */
  input: Record<string, unknown>;
  /** Resolved IR command, when the lookup succeeds. */
  irCommand?: Readonly<IRCommand>;
  /** The command result (success flag, emitted events, error). */
  result: Readonly<CommandResult>;
}

/** @internal Subset of ManifestTelemetryHooks relevant to this module. */
interface TelemetryHooks {
  onCommandExecuted?(
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ): void | Promise<void>;
  onCommandSettled?(info: CommandSettledInfo): void | Promise<void>;
}

/** @internal Shape of the context keys the factory injects. */
interface ContextWithTelemetry {
  telemetry?: TelemetryHooks;
  /** Tenant id (factory injects `tenantId: user.tenantId`). */
  tenantId?: string;
  /** Acting user (factory injects `user: { id, tenantId, role }`). */
  user?: { id?: string };
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
 * Derive the target instance for instance-scoped verbs from `body.id` when
 * the caller didn't pass `options.instanceId` (same convention as
 * `deriveInstanceIdFromBody` in run-manifest-command-core). This MUST be
 * threaded into `super.runCommand`: the upstream engine silently skips every
 * `mutate` action when `options.instanceId` is absent while still reporting
 * success and emitting events — hand-rolled routes that call
 * `runtime.runCommand` directly (composite recipe update, contract send,
 * allergen dish update, …) were persisting nothing. `create` is excluded so
 * the engine's auto-create path stays in control of instantiation.
 */
function deriveEffectiveInstanceId(
  commandName: string,
  body: Record<string, unknown>,
  options: RunCommandOptions
): string | undefined {
  if (options.instanceId || commandName === "create") {
    return options.instanceId;
  }
  return typeof body.id === "string" && body.id.length > 0
    ? body.id
    : undefined;
}

/**
 * R4 — Surface command failures so silently-swallowed reaction failures
 * (e.g. BattleBoard.create triggered by EventCreated reaction) appear in
 * api logs instead of vanishing. Non-throwing; best-effort structured log.
 */
function logCommandFailure(
  entityName: string | undefined,
  commandName: string,
  result: CommandResult
): void {
  try {
    const err =
      (result as unknown as { error?: unknown }).error ??
      (result as unknown as { message?: unknown }).message ??
      "unknown error";
    const guard = (result as unknown as { guardFailure?: { formatted?: string } })
      .guardFailure;
    const detail = guard?.formatted ?? stringifyCommandError(err);
    console.error(
      `[manifest-runtime] command failed: ${entityName ?? "??"}.${commandName} — ${detail}`
    );
  } catch {
    // Defensive: never let logging crash the call path.
  }
}

/** Render an unknown error value without collapsing objects to "[object Object]". */
function stringifyCommandError(err: unknown): string {
  if (typeof err === "string") {
    return err;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return JSON.stringify(err);
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

  override runCommand(
    commandName: string,
    input: Record<string, unknown>,
    options: RunCommandOptions = {}
  ): Promise<CommandResult> {
    // Trace every command in an OTLP-exportable span. Re-entrant dispatches
    // from middleware (the reaction/fan-out mechanism: `dispatchCommand` ->
    // engine.runCommand) execute inside this active span and nest automatically
    // as child spans, turning the propagation graph into an observable timeline.
    const traceCtx = this.getContext() as ContextWithTelemetry;
    return withManifestSpan(
      "manifest.command",
      {
        entity: options.entityName,
        command: commandName,
        tenantId: traceCtx.tenantId,
        actorId: traceCtx.user?.id,
      },
      () => this.#runCommandTraced(commandName, input, options),
      (span, result) => {
        span.setAttribute("manifest.command.success", result.success);
        const events = result.emittedEvents ?? [];
        if (events.length > 0) {
          span.setAttribute("manifest.events.count", events.length);
          span.setAttribute(
            "manifest.events",
            events.map((event) => event.name).join(",")
          );
        }
      }
    );
  }

  async #runCommandTraced(
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

    const instanceId = deriveEffectiveInstanceId(commandName, body, options);

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

    const effectiveOptions =
      instanceId === options.instanceId
        ? options
        : { ...options, instanceId };

    const startedAtMs = Date.now();
    const result = await super.runCommand(commandName, input, effectiveOptions);
    const durationMs = Date.now() - startedAtMs;

    if (!result.success) {
      logCommandFailure(options.entityName, commandName, result);
    }

    await this.#fireExecutedHook(commandName, options.entityName, result);
    await this.#fireSettledHook(commandName, input, options, result, durationMs);

    return result;
  }

  /** Fire the `onCommandExecuted` telemetry hook only when there is something to report. */
  async #fireExecutedHook(
    commandName: string,
    entityName: string | undefined,
    result: CommandResult
  ): Promise<void> {
    if (!(result.success && result.emittedEvents?.length)) {
      return;
    }
    const ctx = this.getContext() as ContextWithTelemetry;
    const hook = ctx.telemetry?.onCommandExecuted;
    if (!hook) {
      return;
    }
    const irCommand = this.getCommand(commandName, entityName);
    if (irCommand) {
      await hook(irCommand, result, entityName);
    }
  }

  /**
   * Observability: the settle hook fires for EVERY command — success OR
   * failure — so the reaction-execution log captures silent no-ops and
   * guard failures, not just successful emissions. Best-effort and
   * non-throwing: observability must never break the command path.
   */
  async #fireSettledHook(
    commandName: string,
    input: Record<string, unknown>,
    options: RunCommandOptions,
    result: CommandResult,
    durationMs: number
  ): Promise<void> {
    try {
      const ctx = this.getContext() as ContextWithTelemetry;
      const settled = ctx.telemetry?.onCommandSettled;
      if (settled) {
        await settled({
          commandName,
          entityName: options.entityName,
          irCommand:
            this.getCommand(commandName, options.entityName) ?? undefined,
          result,
          durationMs,
          correlationId: options.correlationId,
          causationId: options.causationId,
          input,
        });
      }
    } catch {
      // Swallow — never let the observability hook crash the call path.
    }
  }
}
