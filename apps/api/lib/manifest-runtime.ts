/**
 * Manifest runtime factory — API app shim.
 *
 * This module is a thin wrapper around the shared factory in
 * `@repo/manifest-runtime/manifest-runtime-factory`. It injects the
 * API-specific singletons (database, Sentry, logger) and preserves the
 * existing export surface so that generated routes keep importing from
 * `@/lib/manifest-runtime` without changes.
 *
 * @packageDocumentation
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import { database } from "@repo/database";
import { createEnvFlagProvider } from "@repo/manifest-runtime/flag-provider";
import {
  createManifestRuntime as createSharedRuntime,
  type ReactionLogRow,
} from "@repo/manifest-runtime/manifest-runtime-factory";
import { registerManifestStoreIssueReporter } from "@repo/manifest-runtime/prisma-store";
import { captureException } from "@sentry/nextjs";
import { installConstraintLogDedup } from "./manifest/constraint-log-dedup";
import { logManifestIssue } from "./manifest/issue-log";
import {
  createIssueLogTelemetry,
  mergeTelemetryHooks,
} from "./manifest/issue-log-telemetry";
import { createManifestRuntimeLogger } from "./manifest/manifest-runtime-log";
import { createSentryTelemetry } from "./manifest/telemetry";
import { publish as publishRealtime } from "./realtime/pubsub";

// Collapse the engine's per-mutate non-blocking-constraint console spam
// (e.g. warnLargeGuestCount logged ~41x for one Event.update) into one line.
// Idempotent; remove once the engine evaluates constraints once per command.
installConstraintLogDedup();

registerManifestStoreIssueReporter((entityName) => {
  logManifestIssue({
    kind: "store_missing",
    entity: entityName,
    message: "No Prisma store registered — commands will fail",
  });
});

const manifestTelemetry = mergeTelemetryHooks(
  createSentryTelemetry(),
  createIssueLogTelemetry()
);
const manifestRuntimeLog = createManifestRuntimeLogger();
const flagProvider = createEnvFlagProvider();

/** Per-tenant SSE channel the reaction-history dashboard subscribes to. */
const reactionChannel = (tenantId: string): string =>
  `tenant:${tenantId}:reactions`;

/**
 * Sink for the append-only reaction-execution log.
 *
 * This is an OPERATIONAL/observability log, NOT a governed mutation
 * (constitution §11: operational logs are not semantic events; §8: classified
 * `infrastructure`). It is written directly to `reaction_logs` — the same
 * direct-write pattern used by ActivityFeed / audit_log / outbox — and must
 * never route through `RuntimeEngine.runCommand`.
 *
 * Fire-and-forget: the DB write is intentionally NOT awaited and never throws
 * back into the command path, so reaction logging can never slow or break a
 * governed command. After persisting, the row is fanned out over the tenant's
 * SSE channel so the dashboard updates live.
 */
// Circuit breaker: if the reaction_logs table isn't provisioned yet (P2021),
// every command would otherwise spam the same Prisma error twice (once by the
// global Prisma error logger, once by the catch below). Trip once, then skip
// the doomed write until restart (self-heals once the migration is applied).
let reactionLogTableMissing = false;

function reactionLogSink(row: ReactionLogRow): void {
  if (!reactionLogTableMissing) {
    database.reactionLog
      .create({
        data: {
          tenantId: row.tenantId,
          actorId: row.actorId,
          entity: row.entity,
          command: row.command,
          status: row.status,
          emittedEvents: row.emittedEvents,
          reactions: row.reactions,
          errorMessage: row.errorMessage,
          payloadKeys: row.payloadKeys,
          durationMs: row.durationMs,
          correlationId: row.correlationId,
          causationId: row.causationId,
          source: row.source,
        },
      })
      .catch((error: unknown) => {
        // Observability must never break command execution — log and move on.
        // Missing table → trip the breaker so we stop issuing failing writes.
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: unknown }).code === "P2021"
        ) {
          reactionLogTableMissing = true;
          manifestRuntimeLog.info(
            "[reaction-log] reaction_logs table missing — disabling reaction logging until restart (apply the migration to enable)"
          );
          return;
        }
        manifestRuntimeLog.error("[reaction-log] reaction_logs write failed", {
          entity: row.entity ?? "unknown",
          command: row.command,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }

  try {
    publishRealtime(reactionChannel(row.tenantId), {
      name: "reaction.logged",
      data: { ...row, createdAt: new Date().toISOString() },
    });
  } catch {
    // SSE fanout is best-effort; a publish failure must not affect the command.
  }
}

/**
 * Context for creating a manifest runtime.
 */
interface GeneratedRuntimeContext {
  /** Acting user identifier — forwarded to the engine's RuntimeContext. */
  actorId?: string;
  entityName?: string;
  /**
   * Optional Prisma transaction client for atomic multi-entity writes.
   * When provided, ALL internal Prisma operations use this client instead
   * of the main singleton.
   */
  prismaOverride?: import("@repo/manifest-runtime/manifest-runtime-factory").PrismaTransactionClient;
  /** Caller-supplied request id; surfaces in diagnostics and emitted events. */
  requestId?: string;
  /** Origin surface: 'route' | 'job' | 'cli' | 'test' | 'ui' | 'workflow'. */
  source?: string;
  user: {
    id: string;
    tenantId: string;
    role?: string;
  };
}

/**
 * Create a manifest runtime with Prisma-based storage and transactional outbox.
 *
 * Delegates to the shared factory in `@repo/manifest-runtime`, injecting
 * API-specific singletons for database access, logging, error capture, and
 * Sentry telemetry.
 *
 * @example
 * ```typescript
 * const runtime = await createManifestRuntime({
 *   user: { id: "user-123", tenantId: "tenant-456" },
 *   entityName: "PrepTask",
 * });
 *
 * const result = await runtime.runCommand("claim", { userId: "user-123" }, {
 *   entityName: "PrepTask",
 *   instanceId: "task-789",
 * });
 * ```
 */
export async function createManifestRuntime(
  ctx: GeneratedRuntimeContext
): Promise<RuntimeEngine> {
  return createSharedRuntime(
    {
      prisma: database,
      prismaOverride: ctx.prismaOverride,
      log: manifestRuntimeLog,
      captureException,
      telemetry: manifestTelemetry,
      flagProvider,
      reactionLogSink,
    },
    ctx
  );
}

/**
 * Re-export runtime types for convenience.
 *
 * Only `CommandResult` and `RuntimeEngine` are actively imported by
 * `apps/api/app/api/inventory/audit/discrepancies/[id]/resolve/route.ts`.
 */
export type { CommandResult, RuntimeEngine } from "@angriff36/manifest";

/**
 * Re-export the async-reaction store accessor so the worker drain route can
 * read the process-singleton store without importing the factory shim's
 * internals. `undefined` in test/no-DB contexts.
 */
export { getAsyncReactionStore } from "@repo/manifest-runtime/manifest-runtime-factory";
