/**
 * Manifest runtime factory — API app shim.
 *
 * This module is a thin wrapper around the shared factory in
 * `@repo/manifest-adapters/manifest-runtime-factory`. It injects the
 * API-specific singletons (database, Sentry, logger) and preserves the
 * existing export surface so that generated routes keep importing from
 * `@/lib/manifest-runtime` without changes.
 *
 * @packageDocumentation
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import { database } from "@repo/database";
import { createManifestRuntime as createSharedRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { createSentryTelemetry } from "./manifest/telemetry";

// Singleton Sentry telemetry hooks — created once, reused across all runtimes.
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
  entityName?: string;
}

/**
 * Create a manifest runtime with Prisma-based storage and transactional outbox.
 *
 * Delegates to the shared factory in `@repo/manifest-adapters`, injecting
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
      log,
      captureException,
      telemetry: sentryTelemetry,
    },
    ctx
  );
}

// ---------------------------------------------------------------------------
// Per-entity convenience helpers (preserve existing export surface)
// ---------------------------------------------------------------------------

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
  return createManifestRuntime({ user });
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
  return createManifestRuntime({ user });
}

/** Helper to create a runtime specifically for InventorySupplier operations */
export function createInventorySupplierRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user });
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
