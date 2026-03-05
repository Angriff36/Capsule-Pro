/**
 * Manifest runtime factory — App shim for server actions.
 *
 * This module is a thin wrapper around the shared factory in
 * `@repo/manifest-adapters/manifest-runtime-factory`. It injects the
 * app-specific singletons (database, Sentry, logger) so server actions
 * can use the manifest runtime directly.
 *
 * @packageDocumentation
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import { database } from "@repo/database";
import { createManifestRuntime as createSharedRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";

/**
 * Context for creating a manifest runtime.
 */
interface GeneratedRuntimeContext {
  user: {
    id: string;
    tenantId: string;
    role?: string;
  };
  entityName?: string;
}

/**
 * Create a manifest runtime with Prisma-based storage and transactional outbox.
 *
 * Delegates to the shared factory in `@repo/manifest-adapters`, injecting
 * app-specific singletons for database access, logging, and error capture.
 *
 * @example
 * ```typescript
 * const runtime = await createManifestRuntime({
 *   user: { id: "user-123", tenantId: "tenant-456" },
 *   entityName: "PrepTask",
 * });
 *
 * const result = await runtime.runCommand("update", { id: "task-789", name: "New name" });
 * ```
 */
export async function createManifestRuntime(
  ctx: GeneratedRuntimeContext
): Promise<RuntimeEngine> {
  return createSharedRuntime(
    {
      prisma: database,
      log,
      captureException,
      telemetry: undefined,
    },
    ctx
  );
}

/**
 * Re-export runtime types for convenience.
 */
export type {
  CommandResult,
  EmittedEvent,
  RuntimeContext,
  RuntimeEngine,
  RuntimeOptions,
} from "@angriff36/manifest";
