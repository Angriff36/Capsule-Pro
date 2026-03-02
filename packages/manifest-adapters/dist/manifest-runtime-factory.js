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
import { PrismaIdempotencyStore } from "./prisma-idempotency-store.js";
import { PrismaJsonStore } from "./prisma-json-store.js";
import { createPrismaOutboxWriter, PrismaStore } from "./prisma-store.js";
import { loadPrecompiledIR } from "./runtime/loadManifests.js";
import { ManifestRuntimeEngine } from "./runtime-engine.js";
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
    "RecipeStep",
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
function getManifestIR(irPath) {
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
async function resolveUserRole(prisma, user) {
    if (user.role) {
        return user;
    }
    try {
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
    }
    catch (error) {
        // Clerk user IDs (e.g. user_...) are not UUIDs. Some callers still pass
        // auth IDs instead of internal DB UUIDs; fallback below resolves role by
        // authUserId when UUID lookup fails.
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes("invalid input syntax for type uuid")) {
            throw error;
        }
    }
    // Fallback lookup by authUserId for Clerk-style IDs.
    const byAuthUser = await prisma.user.findFirst({
        where: {
            authUserId: user.id,
            tenantId: user.tenantId,
            deletedAt: null,
        },
        select: { role: true },
    });
    if (byAuthUser?.role) {
        return { ...user, role: byAuthUser.role };
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
export async function createManifestRuntime(deps, ctx) {
    if (process.env.NEXT_RUNTIME === "edge") {
        throw new Error("Manifest runtime requires Node.js runtime (Edge runtime is unsupported).");
    }
    // Use override client when provided (for atomic multi-entity writes)
    const prisma = deps.prismaOverride ?? deps.prisma;
    // 1. Resolve role from DB when not provided by the caller.
    const resolvedUser = await resolveUserRole(prisma, ctx.user);
    // 2. Load precompiled IR.
    const ir = getManifestIR();
    // 3. Create a shared event collector for transactional outbox pattern.
    const eventCollector = [];
    // 4. Build the store provider — entities with dedicated Prisma models use
    //    PrismaStore; everything else falls back to PrismaJsonStore.
    const storeProvider = (entityName) => {
        if (ENTITIES_WITH_SPECIFIC_STORES.has(entityName)) {
            const outboxWriter = createPrismaOutboxWriter(entityName, resolvedUser.tenantId);
            // biome-ignore lint/suspicious/noExplicitAny: PrismaStoreConfig expects the full PrismaClient; callers inject a structurally-compatible superset.
            const config = {
                prisma: prisma,
                entityName,
                tenantId: resolvedUser.tenantId,
                outboxWriter,
                eventCollector,
            };
            return new PrismaStore(config);
        }
        // Fall back to generic JSON store for entities without dedicated models.
        deps.log.info(`[manifest-runtime] Using PrismaJsonStore for entity: ${entityName}`);
        // biome-ignore lint/suspicious/noExplicitAny: PrismaJsonStore expects the full PrismaClient; callers inject a structurally-compatible superset.
        return new PrismaJsonStore({
            prisma: prisma,
            tenantId: resolvedUser.tenantId,
            entityType: entityName,
        });
    };
    // 5. Build telemetry hooks — combine caller-provided telemetry with
    //    outbox event persistence (preserving existing behavior exactly).
    const telemetry = {
        onConstraintEvaluated: deps.telemetry?.onConstraintEvaluated,
        onOverrideApplied: deps.telemetry?.onOverrideApplied,
        onCommandExecuted: async (command, result, entityName) => {
            // Fire caller-provided telemetry (e.g. Sentry metrics).
            deps.telemetry?.onCommandExecuted?.(command, result, entityName);
            // Write emitted events to outbox for reliable delivery.
            if (result.success &&
                result.emittedEvents &&
                result.emittedEvents.length > 0) {
                const outboxWriter = createPrismaOutboxWriter(entityName || "unknown", resolvedUser.tenantId);
                const aggregateId = result.result?.id || "unknown";
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
                        await outboxWriter(deps.prismaOverride, eventsToWrite);
                    }
                    else {
                        await deps.prisma.$transaction(async (tx) => {
                            // biome-ignore lint/suspicious/noExplicitAny: outboxWriter expects the full PrismaClient; tx is structurally compatible.
                            await outboxWriter(tx, eventsToWrite);
                        });
                    }
                }
                catch (error) {
                    deps.log.error("[manifest-runtime] Failed to write events to outbox", {
                        error,
                    });
                    deps.captureException(error);
                    throw error;
                }
            }
        },
    };
    // 6. Idempotency store for command deduplication.
    //    IMPORTANT: The runtime engine REJECTS commands when an idempotency store
    //    is configured but no idempotencyKey is provided. Since generated routes
    //    do NOT pass idempotencyKey, we must NOT create the store by default.
    //    Only create it when the caller explicitly opts in via deps.idempotency.
    //
    //    Phase 2: When generated routes are updated to pass idempotencyKey,
    //    re-enable the default store creation.
    // biome-ignore lint/suspicious/noExplicitAny: PrismaIdempotencyStore expects the full PrismaClient; callers inject a structurally-compatible superset.
    const idempotencyStore = deps.idempotency
        ? new PrismaIdempotencyStore({
            prisma: prisma,
            tenantId: resolvedUser.tenantId,
        })
        : undefined;
    // 7. Assemble and return the runtime engine.
    return new ManifestRuntimeEngine(ir, { user: resolvedUser, eventCollector, telemetry }, { storeProvider, idempotencyStore });
}
