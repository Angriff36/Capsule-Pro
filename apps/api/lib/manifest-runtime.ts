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
import { createManifestRuntime as createSharedRuntime } from "@repo/manifest-runtime/manifest-runtime-factory";
import { createEnvFlagProvider } from "@repo/manifest-runtime/flag-provider";
import { registerManifestStoreIssueReporter } from "@repo/manifest-runtime/prisma-store";
import { captureException } from "@sentry/nextjs";
import {
  createIssueLogTelemetry,
  mergeTelemetryHooks,
} from "./manifest/issue-log-telemetry";
import { logManifestIssue } from "./manifest/issue-log";
import { createManifestRuntimeLogger } from "./manifest/manifest-runtime-log";
import { createSentryTelemetry } from "./manifest/telemetry";

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

/**
 * Context for creating a manifest runtime.
 */
interface GeneratedRuntimeContext {
  user: {
    id: string;
    tenantId: string;
    role?: string;
  };
  /** Acting user identifier — forwarded to the engine's RuntimeContext. */
  actorId?: string;
  /** Caller-supplied request id; surfaces in diagnostics and emitted events. */
  requestId?: string;
  /** Origin surface: 'route' | 'job' | 'cli' | 'test' | 'ui' | 'workflow'. */
  source?: string;
  entityName?: string;
  /**
   * Optional Prisma transaction client for atomic multi-entity writes.
   * When provided, ALL internal Prisma operations use this client instead
   * of the main singleton.
   */
  prismaOverride?: import("@repo/manifest-runtime/manifest-runtime-factory").PrismaTransactionClient;
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
