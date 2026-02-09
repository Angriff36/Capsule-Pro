/**
 * Manifest runtime factory for generated command handlers.
 *
 * Supports multiple domain manifests (PrepTask, Menu, Recipe, etc.) by loading
 * the appropriate IR based on the entity name in context.
 *
 * Loads manifests directly to avoid importing kitchen-ops index
 * (which pulls in server-only Prisma/Postgres/Supabase dependencies).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR, type IR, RuntimeEngine } from "@repo/manifest";

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

function getManifestForEntity(entityName: string): string {
  return ENTITY_TO_MANIFEST[entityName] ?? "prep-task-rules";
}

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
      `Failed to compile ${manifestName} manifest: ${diagnostics.map((d) => d.message).join(", ")}`
    );
  }

  manifestIRCache.set(manifestName, ir);
  return ir;
}

export async function createManifestRuntime(
  ctx: GeneratedRuntimeContext
): Promise<RuntimeEngine> {
  // Determine which manifest to load
  const manifestName =
    ctx.manifestName ??
    (ctx.entityName ? getManifestForEntity(ctx.entityName) : "prep-task-rules");

  const ir = await getManifestIR(manifestName);

  return new RuntimeEngine(ir, {
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
}

/** Helper to create a runtime specifically for Menu operations */
export async function createMenuRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "menu-rules" });
}

/** Helper to create a runtime specifically for PrepTask operations */
export async function createPrepTaskRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "prep-task-rules" });
}

/** Helper to create a runtime specifically for Recipe operations */
export async function createRecipeRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "recipe-rules" });
}

/** Helper to create a runtime specifically for PrepList operations */
export async function createPrepListRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "prep-list-rules" });
}

/** Helper to create a runtime specifically for Inventory operations */
export async function createInventoryRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "inventory-rules" });
}

/** Helper to create a runtime specifically for Station operations */
export async function createStationRuntime(user: {
  id: string;
  tenantId: string;
}): Promise<RuntimeEngine> {
  return createManifestRuntime({ user, manifestName: "station-rules" });
}
