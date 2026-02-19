/**
 * Manifest runtime factory for generated command handlers.
 *
 * This module creates Manifest runtime instances with Prisma-based storage
 * and transactional outbox support for reliable event delivery.
 *
 * Key features:
 * - Prisma interactive transactions for atomic state + outbox writes
 * - Optimistic concurrency control via version properties
 * - Proper tenant isolation
 * - Event emission to outbox for reliable Ably publishing
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
import { database, type PrismaClient } from "@repo/database";
import { PrismaIdempotencyStore } from "@repo/manifest-adapters/prisma-idempotency-store";
import { PrismaJsonStore } from "@repo/manifest-adapters/prisma-json-store";
import type { PrismaStoreConfig } from "@repo/manifest-adapters/prisma-store";
import {
  createPrismaOutboxWriter,
  PrismaStore,
} from "@repo/manifest-adapters/prisma-store";
import { getCompiledManifestBundle } from "@repo/manifest-adapters/runtime/loadManifests";
import { ManifestRuntimeEngine } from "@repo/manifest-adapters/runtime-engine";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { createSentryTelemetry } from "./manifest/telemetry";

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

// Singleton Sentry telemetry hooks - created once, reused across all runtimes
const sentryTelemetry = createSentryTelemetry();

/**
 * Context for creating a manifest runtime.
 */
interface GeneratedRuntimeContext {
  user: {
    id: string;
    tenantId: string;
    role?: string;
  };
}

type ManifestIR = IR;

/**
 * Load and compile a manifest IR, with caching.
 */
async function getManifestIR(): Promise<ManifestIR> {
  const { ir, hash } = await getCompiledManifestBundle();

  if (process.env.DEBUG_MANIFEST_IR === "true") {
    log.info("[manifest-runtime] Loaded manifest bundle", {
      hash,
      entities: ir.entities.length,
      commands: ir.commands.length,
    });
  }

  return ir;
}

/**
 * Create a Prisma-based store provider for the given tenant and entity.
 *
 * The store provider returns a PrismaStore configured with:
 * - Transactional outbox event writes
 * - Optimistic concurrency control
 * - Proper tenant isolation
 */
function _createPrismaStoreProvider(
  tenantId: string,
  entityName: string
): RuntimeOptions["storeProvider"] {
  return () => {
    const outboxWriter = createPrismaOutboxWriter(entityName, tenantId);

    const config: PrismaStoreConfig = {
      prisma: database,
      entityName,
      tenantId,
      outboxWriter,
    };

    return new PrismaStore(config);
  };
}

/**
 * Create a manifest runtime with Prisma-based storage and transactional outbox.
 *
 * This factory creates a RuntimeEngine configured to:
 * - Use PrismaStore for entity operations (within Prisma transactions)
 * - Write outbox events transactionally with state mutations
 * - Enforce optimistic concurrency control via version properties
 * - Properly isolate data by tenant
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
  if (process.env.NEXT_RUNTIME === "edge") {
    throw new Error(
      "Manifest runtime requires Node.js runtime (Edge runtime is unsupported)."
    );
  }

  const ir = await getManifestIR();

  // Create a shared event collector for transactional outbox pattern
  // This array will be populated with events during command execution
  // and consumed by PrismaStore within the same transaction
  const eventCollector: EmittedEvent[] = [];

  // Create a store provider for each entity in the manifest.
  // Entities with dedicated Prisma models use PrismaStore (hand-written field mappings).
  // All other entities fall back to PrismaJsonStore (generic JSON blob storage).
  const storeProvider: RuntimeOptions["storeProvider"] = (
    entityName: string
  ) => {
    if (ENTITIES_WITH_SPECIFIC_STORES.has(entityName)) {
      const outboxWriter = createPrismaOutboxWriter(
        entityName,
        ctx.user.tenantId
      );

      const config: PrismaStoreConfig = {
        prisma: database,
        entityName,
        tenantId: ctx.user.tenantId,
        outboxWriter,
        eventCollector, // Share the event collector with the store
      };

      return new PrismaStore(config);
    }

    // Fall back to generic JSON store for all Phase 1-7 entities
    // that don't have dedicated Prisma models yet
    log.info(
      `[manifest-runtime] Using PrismaJsonStore for entity: ${entityName}`
    );
    return new PrismaJsonStore({
      prisma: database,
      tenantId: ctx.user.tenantId,
      entityType: entityName,
    });
  };

  // Telemetry hooks: Sentry observability + transactional outbox event writes.
  // onConstraintEvaluated and onOverrideApplied are pure Sentry metrics.
  // onCommandExecuted combines Sentry metrics with outbox event persistence.
  const telemetry = {
    onConstraintEvaluated: sentryTelemetry.onConstraintEvaluated,
    onOverrideApplied: sentryTelemetry.onOverrideApplied,
    onCommandExecuted: async (
      command: Readonly<IRCommand>,
      result: Readonly<CommandResult>,
      entityName?: string
    ) => {
      // Fire Sentry telemetry (non-blocking, sync)
      sentryTelemetry.onCommandExecuted?.(command, result, entityName);

      // Write emitted events to outbox for reliable delivery
      if (
        result.success &&
        result.emittedEvents &&
        result.emittedEvents.length > 0
      ) {
        const outboxWriter = createPrismaOutboxWriter(
          entityName || "unknown",
          ctx.user.tenantId
        );

        const aggregateId = (result.result as { id?: string })?.id || "unknown";

        const eventsToWrite = result.emittedEvents.map((event) => ({
          eventType: event.name,
          payload: event.payload,
          aggregateId,
        }));

        try {
          await database.$transaction(async (tx) => {
            await outboxWriter(tx as PrismaClient, eventsToWrite);
          });
        } catch (error) {
          log.error("[manifest-runtime] Failed to write events to outbox", {
            error,
          });
          captureException(error);
          throw error;
        }
      }
    },
  };

  // Create idempotency store for command deduplication.
  // When a command is retried with the same idempotency key,
  // the cached result is returned without re-execution.
  const idempotencyStore = new PrismaIdempotencyStore({
    prisma: database,
    tenantId: ctx.user.tenantId,
  });

  return new ManifestRuntimeEngine(
    ir,
    { user: ctx.user, eventCollector, telemetry },
    { storeProvider, idempotencyStore }
  );
}

/** Helper to create a runtime specifically for Menu operations */
export function createMenuRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for PrepTask operations */
export function createPrepTaskRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Recipe operations */
export function createRecipeRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for PrepList operations */
export function createPrepListRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Inventory operations */
export function createInventoryRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Station operations */
export function createStationRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for KitchenTask operations */
export function createKitchenTaskRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

// --- Phase 1: Kitchen Operations ---

/** Helper to create a runtime specifically for PrepComment operations */
export function createPrepCommentRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Ingredient operations */
export function createIngredientRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Dish operations */
export function createDishRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Container operations */
export function createContainerRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for PrepMethod operations */
export function createPrepMethodRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

// --- Phase 2: Events & Catering ---

/** Helper to create a runtime specifically for Event operations */
export function createEventRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for EventReport operations */
export function createEventReportRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for EventBudget operations */
export function createEventBudgetRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for CateringOrder operations */
export function createCateringOrderRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for BattleBoard operations */
export function createBattleBoardRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

// --- Phase 3: CRM & Sales ---

/** Helper to create a runtime specifically for Client operations */
export function createClientRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Lead operations */
export function createLeadRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Proposal operations */
export function createProposalRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for ClientInteraction operations */
export function createClientInteractionRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({
    user,
  });
}

// --- Phase 4: Purchasing & Inventory ---

/** Helper to create a runtime specifically for PurchaseOrder operations */
export function createPurchaseOrderRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Shipment operations */
export function createShipmentRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for InventoryTransaction operations */
export function createInventoryTransactionRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({
    user,
  });
}

/** Helper to create a runtime specifically for InventorySupplier operations */
export function createInventorySupplierRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({
    user,
  });
}

/** Helper to create a runtime specifically for CycleCount operations */
export function createCycleCountRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

// --- Phase 5: Staff & Scheduling ---

/** Helper to create a runtime specifically for User operations */
export function createUserRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Schedule operations */
export function createScheduleRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for TimeEntry operations */
export function createTimeEntryRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

// --- Phase 6: Command Board ---

/** Helper to create a runtime specifically for CommandBoard operations */
export function createCommandBoardRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

// --- Phase 7: Workflows & Notifications ---

/** Helper to create a runtime specifically for Workflow operations */
export function createWorkflowRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for Notification operations */
export function createNotificationRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
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
