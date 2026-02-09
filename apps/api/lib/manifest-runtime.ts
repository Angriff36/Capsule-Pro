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
import { database } from "@repo/database";
import {
  compileToIR,
  type IR,
  RuntimeEngine,
  type RuntimeOptions,
} from "@repo/manifest";
import {
  createPrismaOutboxWriter,
  type PrismaStoreConfig,
} from "@repo/manifest/prisma-store";

/**
 * Context for creating a manifest runtime.
 */
interface GeneratedRuntimeContext {
  user: {
    id: string;
    tenantId: string;
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
  PrepTask: "prep-task-rules",
  Menu: "menu-rules",
  MenuDish: "menu-rules",
  Recipe: "recipe-rules",
  RecipeVersion: "recipe-rules",
  Ingredient: "recipe-rules",
  RecipeIngredient: "recipe-rules",
  Dish: "recipe-rules",
  PrepList: "prep-list-rules",
  PrepListItem: "prep-list-rules",
  InventoryItem: "inventory-rules",
  Station: "station-rules",
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
    `../../packages/kitchen-ops/manifests/${manifestName}.manifest`
  );

  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile ${manifestName} manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
    );
  }

  manifestIRCache.set(manifestName, ir);
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
function createPrismaStoreProvider(
  tenantId: string,
  entityName: string
): RuntimeOptions["storeProvider"] {
  return () => {
    const { PrismaStore } = require("@repo/manifest/prisma-store");

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

  // Create a store provider for each entity in the manifest
  // This allows different entities to use their own Prisma models
  const storeProvider: RuntimeOptions["storeProvider"] = (
    entityName: string
  ) => {
    const { PrismaStore } = require("@repo/manifest/prisma-store");

    const outboxWriter = createPrismaOutboxWriter(
      entityName,
      ctx.user.tenantId
    );

    const config: PrismaStoreConfig = {
      prisma: database,
      entityName,
      tenantId: ctx.user.tenantId,
      outboxWriter,
    };

    return new PrismaStore(config);
  };

  return new RuntimeEngine(ir, {
    user: ctx.user,
    storeProvider,
  });
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

/**
 * Re-export runtime types for convenience.
 */
export type {
  CommandResult,
  RuntimeContext,
  RuntimeEngine,
  RuntimeOptions,
} from "@repo/manifest";
