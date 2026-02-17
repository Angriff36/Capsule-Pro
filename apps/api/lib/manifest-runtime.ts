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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommandResult,
  EmittedEvent,
  RuntimeEngine,
  RuntimeOptions,
} from "@angriff36/manifest";
import type { IR, IRCommand } from "@angriff36/manifest/ir";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { database, type PrismaClient } from "@repo/database";
import { enforceCommandOwnership } from "@repo/manifest-adapters/ir-contract";
import { PrismaIdempotencyStore } from "@repo/manifest-adapters/prisma-idempotency-store";
import { PrismaJsonStore } from "@repo/manifest-adapters/prisma-json-store";
import type { PrismaStoreConfig } from "@repo/manifest-adapters/prisma-store";
import {
  createPrismaOutboxWriter,
  PrismaStore,
} from "@repo/manifest-adapters/prisma-store";
import { ManifestRuntimeEngine } from "@repo/manifest-adapters/runtime-engine";
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
  /** Optional entity name to auto-detect which manifest to load */
  entityName?: string;
  /** Optional explicit manifest file name (without .manifest extension) */
  manifestName?: string;
}

type ManifestIR = IR;

// IR cache for each manifest type
const manifestIRCache = new Map<string, ManifestIR>();

/** Mapping from entity names to their manifest files */
const ENTITY_TO_MANIFEST: Record<string, string> = {
  // Phase 0: Original manifests
  PrepTask: "prep-task-rules",
  Menu: "menu-rules",
  MenuDish: "menu-rules",
  Recipe: "recipe-rules",
  RecipeVersion: "recipe-rules",
  RecipeIngredient: "recipe-rules",
  RecipeStep: "recipe-rules",
  PrepList: "prep-list-rules",
  PrepListItem: "prep-list-rules",
  InventoryItem: "inventory-rules",
  Station: "station-rules",
  KitchenTask: "kitchen-task-rules",

  // Phase 1: Kitchen Operations
  PrepComment: "prep-comment-rules",
  Ingredient: "ingredient-rules",
  Dish: "dish-rules",
  Container: "container-rules",
  PrepMethod: "prep-method-rules",

  // Phase 2: Events & Catering
  Event: "event-rules",
  EventProfitability: "event-rules",
  EventSummary: "event-rules",
  EventReport: "event-report-rules",
  EventBudget: "event-budget-rules",
  BudgetLineItem: "event-budget-rules",
  CateringOrder: "catering-order-rules",
  BattleBoard: "battle-board-rules",

  // Phase 3: CRM & Sales
  Client: "client-rules",
  ClientContact: "client-rules",
  ClientPreference: "client-rules",
  Lead: "lead-rules",
  Proposal: "proposal-rules",
  ProposalLineItem: "proposal-rules",
  ClientInteraction: "client-interaction-rules",

  // Phase 4: Purchasing & Inventory
  PurchaseOrder: "purchase-order-rules",
  PurchaseOrderItem: "purchase-order-rules",
  Shipment: "shipment-rules",
  ShipmentItem: "shipment-rules",
  InventoryTransaction: "inventory-transaction-rules",
  InventorySupplier: "inventory-supplier-rules",
  CycleCountSession: "cycle-count-rules",
  CycleCountRecord: "cycle-count-rules",
  VarianceReport: "cycle-count-rules",

  // Phase 5: Staff & Scheduling
  User: "user-rules",
  Schedule: "schedule-rules",
  ScheduleShift: "schedule-rules",
  TimeEntry: "time-entry-rules",
  TimecardEditRequest: "time-entry-rules",

  // Phase 6: Command Board
  CommandBoard: "command-board-rules",
  CommandBoardCard: "command-board-rules",
  CommandBoardLayout: "command-board-rules",
  CommandBoardGroup: "command-board-rules",
  CommandBoardConnection: "command-board-rules",

  // Phase 7: Workflows & Notifications
  Workflow: "workflow-rules",
  Notification: "notification-rules",
};

/**
 * Get the manifest name for a given entity.
 */
function getManifestForEntity(entityName: string): string {
  return ENTITY_TO_MANIFEST[entityName] ?? "prep-task-rules";
}

/**
 * Load and compile a manifest IR, with caching.
 */
async function getManifestIR(manifestName: string): Promise<ManifestIR> {
  const cached = manifestIRCache.get(manifestName);
  if (cached) {
    return cached;
  }

  // Resolve from the monorepo packages directory
  const manifestPath = join(
    process.cwd(),
    `../../packages/manifest-adapters/manifests/${manifestName}.manifest`
  );

  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile ${manifestName} manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
    );
  }

  // Debug: Log IR structure before normalization
  if (process.env.DEBUG_MANIFEST_IR === "true") {
    console.log(`[manifest-runtime] IR for ${manifestName}:`, {
      entities: ir.entities.map((e: { name: string; commands: unknown }) => ({
        name: e.name,
        commands: e.commands,
      })),
      commands: ir.commands.map((c: { name: string; entity?: string }) => ({
        name: c.name,
        entity: c.entity,
      })),
    });
  }

  const normalized = enforceCommandOwnership(ir, manifestName);
  manifestIRCache.set(manifestName, normalized);
  return normalized;
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
  // Determine which manifest to load
  const manifestName =
    ctx.manifestName ??
    (ctx.entityName ? getManifestForEntity(ctx.entityName) : "prep-task-rules");

  const ir = await getManifestIR(manifestName);

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
    console.log(
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
          console.error(
            "[manifest-runtime] Failed to write events to outbox:",
            error
          );
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
  return createManifestRuntime({ user, manifestName: "menu-rules" });
}

/** Helper to create a runtime specifically for PrepTask operations */
export function createPrepTaskRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "prep-task-rules" });
}

/** Helper to create a runtime specifically for Recipe operations */
export function createRecipeRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "recipe-rules" });
}

/** Helper to create a runtime specifically for PrepList operations */
export function createPrepListRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "prep-list-rules" });
}

/** Helper to create a runtime specifically for Inventory operations */
export function createInventoryRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "inventory-rules" });
}

/** Helper to create a runtime specifically for Station operations */
export function createStationRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "station-rules" });
}

/** Helper to create a runtime specifically for KitchenTask operations */
export function createKitchenTaskRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "kitchen-task-rules" });
}

// --- Phase 1: Kitchen Operations ---

/** Helper to create a runtime specifically for PrepComment operations */
export function createPrepCommentRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "prep-comment-rules" });
}

/** Helper to create a runtime specifically for Ingredient operations */
export function createIngredientRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "ingredient-rules" });
}

/** Helper to create a runtime specifically for Dish operations */
export function createDishRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "dish-rules" });
}

/** Helper to create a runtime specifically for Container operations */
export function createContainerRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "container-rules" });
}

/** Helper to create a runtime specifically for PrepMethod operations */
export function createPrepMethodRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "prep-method-rules" });
}

// --- Phase 2: Events & Catering ---

/** Helper to create a runtime specifically for Event operations */
export function createEventRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "event-rules" });
}

/** Helper to create a runtime specifically for EventReport operations */
export function createEventReportRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "event-report-rules" });
}

/** Helper to create a runtime specifically for EventBudget operations */
export function createEventBudgetRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "event-budget-rules" });
}

/** Helper to create a runtime specifically for CateringOrder operations */
export function createCateringOrderRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "catering-order-rules" });
}

/** Helper to create a runtime specifically for BattleBoard operations */
export function createBattleBoardRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "battle-board-rules" });
}

// --- Phase 3: CRM & Sales ---

/** Helper to create a runtime specifically for Client operations */
export function createClientRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "client-rules" });
}

/** Helper to create a runtime specifically for Lead operations */
export function createLeadRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "lead-rules" });
}

/** Helper to create a runtime specifically for Proposal operations */
export function createProposalRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "proposal-rules" });
}

/** Helper to create a runtime specifically for ClientInteraction operations */
export function createClientInteractionRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({
    user,
    manifestName: "client-interaction-rules",
  });
}

// --- Phase 4: Purchasing & Inventory ---

/** Helper to create a runtime specifically for PurchaseOrder operations */
export function createPurchaseOrderRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "purchase-order-rules" });
}

/** Helper to create a runtime specifically for Shipment operations */
export function createShipmentRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "shipment-rules" });
}

/** Helper to create a runtime specifically for InventoryTransaction operations */
export function createInventoryTransactionRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({
    user,
    manifestName: "inventory-transaction-rules",
  });
}

/** Helper to create a runtime specifically for InventorySupplier operations */
export function createInventorySupplierRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({
    user,
    manifestName: "inventory-supplier-rules",
  });
}

/** Helper to create a runtime specifically for CycleCount operations */
export function createCycleCountRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "cycle-count-rules" });
}

// --- Phase 5: Staff & Scheduling ---

/** Helper to create a runtime specifically for User operations */
export function createUserRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "user-rules" });
}

/** Helper to create a runtime specifically for Schedule operations */
export function createScheduleRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "schedule-rules" });
}

/** Helper to create a runtime specifically for TimeEntry operations */
export function createTimeEntryRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "time-entry-rules" });
}

// --- Phase 6: Command Board ---

/** Helper to create a runtime specifically for CommandBoard operations */
export function createCommandBoardRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "command-board-rules" });
}

// --- Phase 7: Workflows & Notifications ---

/** Helper to create a runtime specifically for Workflow operations */
export function createWorkflowRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "workflow-rules" });
}

/** Helper to create a runtime specifically for Notification operations */
export function createNotificationRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "notification-rules" });
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
