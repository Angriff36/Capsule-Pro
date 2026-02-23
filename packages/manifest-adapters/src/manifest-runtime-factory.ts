/**
 * Shared manifest runtime factory.
 *
 * This is the ONE canonical implementation of `createManifestRuntime`.
 * Both `apps/api` and `apps/app` use this factory — the only difference
 * is which concrete singletons they inject for prisma, logging, telemetry,
 * and error capture.
 *
 * This module must NOT import:
 *   - `@repo/database`  (injected as deps.prisma)
 *   - `@sentry/nextjs`  (injected as deps.captureException)
 *   - `@repo/observability/log` (injected as deps.log)
 *
 * @packageDocumentation
 */

import type {
  CommandResult,
  EmittedEvent,
  RuntimeEngine,
  RuntimeOptions,
} from "@angriff36/manifest";
import type { IR, IRCommand } from "@angriff36/manifest/ir";
import { PrismaIdempotencyStore } from "./prisma-idempotency-store.js";
import { PrismaJsonStore } from "./prisma-json-store.js";
import type { PrismaStoreConfig } from "./prisma-store.js";
import { createPrismaOutboxWriter, PrismaStore } from "./prisma-store.js";
import { loadPrecompiledIR } from "./runtime/loadManifests.js";
import { ManifestRuntimeEngine } from "./runtime-engine.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimal structural type for the Prisma client.
 *
 * The factory must NOT import `@repo/database` — callers inject their own
 * Prisma singleton. This type captures only the surface area the factory
 * actually uses: `user.findFirst` (for role resolution) and `$transaction`
 * (for outbox writes).
 */
export interface PrismaLike {
  user: {
    findFirst: (args: {
      where: { id: string; tenantId: string; deletedAt: null };
      select: { role: true };
    }) => Promise<{ role: string | null } | null>;
  };
  // biome-ignore lint/suspicious/noExplicitAny: Must accept Prisma's overloaded $transaction signature (array form + function form).
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
}

/** Minimal structured logger the factory needs. */
export interface ManifestRuntimeLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Telemetry hooks wired into the runtime engine context.
 *
 * Uses method syntax (not function-property syntax) so that callers can
 * inject implementations with narrower parameter types without tripping
 * `strictFunctionTypes` contravariance checks.
 */
export interface ManifestTelemetryHooks {
  onConstraintEvaluated?(
    outcome: unknown,
    commandName: string,
    entityName?: string
  ): void;
  onOverrideApplied?(
    constraint: unknown,
    overrideReq: unknown,
    outcome: unknown,
    commandName: string
  ): void;
  onCommandExecuted?(
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ): void | Promise<void>;
}

/** Dependencies injected by the calling app. */
export interface CreateManifestRuntimeDeps {
  /** Prisma client instance (the app's singleton). */
  prisma: PrismaLike;
  /**
   * Optional Prisma override for transaction-aware operations.
   * When provided (typically a transaction client from $transaction callback),
   * ALL internal Prisma operations use this client instead of `prisma`.
   * This enables atomic multi-entity writes in composite routes.
   */
  prismaOverride?: PrismaLike;
  /** Structured logger. */
  log: ManifestRuntimeLogger;
  /** Error capture function (e.g. Sentry.captureException). Returns event id. */
  // biome-ignore lint/suspicious/noExplicitAny: Must accept Sentry's captureException signature which uses a specific hint type, not `unknown`.
  captureException: (err: unknown, context?: any) => unknown;
  /** Telemetry hooks for observability. */
  telemetry?: ManifestTelemetryHooks;
  /** Idempotency configuration (Phase 2: failureTtlMs plumbing). */
  idempotency?: { failureTtlMs?: number };
}

/** Context passed by the caller describing the acting user. */
export interface ManifestRuntimeContext {
  user: {
    id: string;
    tenantId: string;
    role?: string;
  };
  entityName?: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/**
 * Entities that have dedicated Prisma models with hand-written field mappings.
 * All other entities fall back to the generic PrismaJsonStore (JSON blob storage).
 */
const ENTITIES_WITH_SPECIFIC_STORES = new Set([
  "PrepTask",
  "Recipe",
  "RecipeVersion",
  "Ingredient",
  "RecipeIngredient",
  "Dish",
  "Menu",
  "MenuDish",
  "PrepList",
  "PrepListItem",
  "Station",
  "InventoryItem",
  "KitchenTask",
]);

/** Default precompiled IR path (relative to monorepo root). */
const DEFAULT_IR_PATH = "packages/manifest-ir/ir/kitchen/kitchen.ir.json";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Load the precompiled manifest IR from the build artifact.
 *
 * Uses loadPrecompiledIR which anchors to the monorepo root via
 * pnpm-workspace.yaml — safe regardless of what directory Next.js
 * started the server from.
 */
function getManifestIR(irPath?: string): IR {
  const { ir } = loadPrecompiledIR(irPath ?? DEFAULT_IR_PATH);
  return ir;
}

/**
 * Resolve the user's role from the database when the caller didn't provide it.
 *
 * Generated routes that were created before the template included the user
 * DB lookup pass only { id, tenantId }. Without role, every policy that
 * checks `user.role in [...]` evaluates to false → 403 for all users.
 */
async function resolveUserRole(
  prisma: PrismaLike,
  user: ManifestRuntimeContext["user"]
): Promise<ManifestRuntimeContext["user"]> {
  if (user.role) {
    return user;
  }

  const record = await prisma.user.findFirst({
    where: {
      id: user.id,
      tenantId: user.tenantId,
      deletedAt: null,
    },
    select: { role: true },
  });

  if (record?.role) {
    return { ...user, role: record.role };
  }

  return user;
}

// ---------------------------------------------------------------------------
// Factory (the ONE implementation)
// ---------------------------------------------------------------------------

/**
 * Create a manifest runtime with Prisma-based storage and transactional outbox.
 *
 * This is the single canonical factory. Both `apps/api` and `apps/app` call
 * this function — the only difference is which concrete singletons they inject.
 *
 * @example
 * ```typescript
 * // In apps/api (thin shim):
 * import { createManifestRuntime as createShared } from "@repo/manifest-adapters/manifest-runtime-factory";
 * import { database } from "@repo/database";
 * import { log } from "@repo/observability/log";
 * import { captureException } from "@sentry/nextjs";
 *
 * export function createManifestRuntime(ctx) {
 *   return createShared(
 *     { prisma: database, log, captureException, telemetry: sentryTelemetry },
 *     ctx,
 *   );
 * }
 * ```
 */
export async function createManifestRuntime(
  deps: CreateManifestRuntimeDeps,
  ctx: ManifestRuntimeContext
): Promise<RuntimeEngine> {
  if (process.env.NEXT_RUNTIME === "edge") {
    throw new Error(
      "Manifest runtime requires Node.js runtime (Edge runtime is unsupported)."
    );
  }

  // Use override client when provided (for atomic multi-entity writes)
  const prisma = deps.prismaOverride ?? deps.prisma;

  // 1. Resolve role from DB when not provided by the caller.
  const resolvedUser = await resolveUserRole(prisma, ctx.user);

  // 2. Load precompiled IR.
  const ir = getManifestIR();

  // 3. Create a shared event collector for transactional outbox pattern.
  const eventCollector: EmittedEvent[] = [];

  // 4. Build the store provider — entities with dedicated Prisma models use
  //    PrismaStore; everything else falls back to PrismaJsonStore.
  const storeProvider: RuntimeOptions["storeProvider"] = (
    entityName: string
  ) => {
    if (ENTITIES_WITH_SPECIFIC_STORES.has(entityName)) {
      const outboxWriter = createPrismaOutboxWriter(
        entityName,
        resolvedUser.tenantId
      );

      // biome-ignore lint/suspicious/noExplicitAny: PrismaStoreConfig expects the full PrismaClient; callers inject a structurally-compatible superset.
      const config: PrismaStoreConfig = {
        prisma: prisma as any,
        entityName,
        tenantId: resolvedUser.tenantId,
        outboxWriter,
        eventCollector,
      };

      return new PrismaStore(config);
    }

    // Fall back to generic JSON store for entities without dedicated models.
    deps.log.info(
      `[manifest-runtime] Using PrismaJsonStore for entity: ${entityName}`
    );
    // biome-ignore lint/suspicious/noExplicitAny: PrismaJsonStore expects the full PrismaClient; callers inject a structurally-compatible superset.
    return new PrismaJsonStore({
      prisma: prisma as any,
      tenantId: resolvedUser.tenantId,
      entityType: entityName,
    });
  };

  // 5. Build telemetry hooks — combine caller-provided telemetry with
  //    outbox event persistence (preserving existing behavior exactly).
  const telemetry: ManifestTelemetryHooks = {
    onConstraintEvaluated: deps.telemetry?.onConstraintEvaluated,
    onOverrideApplied: deps.telemetry?.onOverrideApplied,
    onCommandExecuted: async (
      command: Readonly<IRCommand>,
      result: Readonly<CommandResult>,
      entityName?: string
    ) => {
      // Fire caller-provided telemetry (e.g. Sentry metrics).
      deps.telemetry?.onCommandExecuted?.(command, result, entityName);

      // Write emitted events to outbox for reliable delivery.
      if (
        result.success &&
        result.emittedEvents &&
        result.emittedEvents.length > 0
      ) {
        const outboxWriter = createPrismaOutboxWriter(
          entityName || "unknown",
          resolvedUser.tenantId
        );

        const aggregateId = (result.result as { id?: string })?.id || "unknown";

        const eventsToWrite = result.emittedEvents.map((event) => ({
          eventType: event.name,
          payload: event.payload,
          aggregateId,
        }));

        try {
          // When prismaOverride is provided (composite route transaction),
          // write directly to the override client - it's already in a transaction.
          // Otherwise, create a new transaction for atomic outbox writes.
          if (deps.prismaOverride) {
            // biome-ignore lint/suspicious/noExplicitAny: outboxWriter expects the full PrismaClient; prismaOverride is structurally compatible.
            await outboxWriter(deps.prismaOverride as any, eventsToWrite);
          } else {
            await deps.prisma.$transaction(async (tx) => {
              // biome-ignore lint/suspicious/noExplicitAny: outboxWriter expects the full PrismaClient; tx is structurally compatible.
              await outboxWriter(tx as any, eventsToWrite);
            });
          }
        } catch (error) {
          deps.log.error(
            "[manifest-runtime] Failed to write events to outbox",
            {
              error,
            }
          );
          deps.captureException(error);
          throw error;
        }
      }
    },
  };

  // 6. Create idempotency store for command deduplication.
  //    Phase 2: deps.idempotency.failureTtlMs is plumbed through the type
  //    signature but NOT mapped into the constructor yet — the original
  //    apps/api implementation never passed ttlMs, so we preserve that
  //    behavior. When Phase 2 lands, add `ttlMs: deps.idempotency?.failureTtlMs`
  //    here.
  // biome-ignore lint/suspicious/noExplicitAny: PrismaIdempotencyStore expects the full PrismaClient; callers inject a structurally-compatible superset.
  const idempotencyStore = new PrismaIdempotencyStore({
    prisma: prisma as any,
    tenantId: resolvedUser.tenantId,
  });

  // 7. Assemble and return the runtime engine.
  return new ManifestRuntimeEngine(
    ir,
    { user: resolvedUser, eventCollector, telemetry },
    { storeProvider, idempotencyStore }
  );
}

// Re-export types that consumers may need.
export type { RuntimeEngine } from "@angriff36/manifest";
