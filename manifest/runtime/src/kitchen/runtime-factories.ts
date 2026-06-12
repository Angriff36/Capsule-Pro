/**
 * Runtime Factories
 *
 * Factory functions for creating kitchen operations runtimes
 */

import type { IR } from "@angriff36/manifest/ir";
import { ManifestRuntimeEngine } from "../runtime-engine";
import {
  loadInventoryManifestIR,
  loadMenuManifestIR,
  loadPrepListManifestIR,
  loadPrepTaskManifestIR,
  loadRecipeManifestIR,
  loadStationManifestIR,
} from "./manifest-ir-loader";
import { createPostgresStoreProvider } from "./postgres-store";
import type { KitchenOpsContext } from "./types";

/**
 * Create a kitchen operations runtime for prep tasks
 */
export async function createPrepTaskRuntime(context: KitchenOpsContext) {
  const ir = await loadPrepTaskManifestIR();
  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(ir, context, options);
  return engine;
}

/**
 * Create a kitchen operations runtime for stations
 */
export async function createStationRuntime(context: KitchenOpsContext) {
  const ir = await loadStationManifestIR();
  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(ir, context, options);
  return engine;
}

/**
 * Create a kitchen operations runtime for inventory
 */
export async function createInventoryRuntime(context: KitchenOpsContext) {
  const ir = await loadInventoryManifestIR();
  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(ir, context, options);
  return engine;
}

/**
 * Create a kitchen operations runtime for recipes
 */
export async function createRecipeRuntime(context: KitchenOpsContext) {
  const ir = await loadRecipeManifestIR();
  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(ir, context, options);
  return engine;
}

/**
 * Create a kitchen operations runtime for menus
 */
export async function createMenuRuntime(context: KitchenOpsContext) {
  const ir = await loadMenuManifestIR();
  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(ir, context, options);
  return engine;
}

/**
 * Create a kitchen operations runtime for prep lists
 */
export async function createPrepListRuntime(context: KitchenOpsContext) {
  const ir = await loadPrepListManifestIR();
  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(ir, context, options);
  return engine;
}

/**
 * Create a combined kitchen operations runtime
 */
export async function createKitchenOpsRuntime(context: KitchenOpsContext) {
  const prepTaskIR = await loadPrepTaskManifestIR();
  const stationIR = await loadStationManifestIR();
  const inventoryIR = await loadInventoryManifestIR();
  const recipeIR = await loadRecipeManifestIR();
  const menuIR = await loadMenuManifestIR();
  const prepListIR = await loadPrepListManifestIR();

  // Combine IRs - in a real implementation, you'd merge modules
  const combinedIR: IR = {
    version: "1.0",
    provenance: prepTaskIR.provenance,
    modules: [
      ...(prepTaskIR.modules || []),
      ...(stationIR.modules || []),
      ...(inventoryIR.modules || []),
      ...(recipeIR.modules || []),
      ...(menuIR.modules || []),
      ...(prepListIR.modules || []),
    ],
    entities: [
      ...prepTaskIR.entities,
      ...stationIR.entities,
      ...inventoryIR.entities,
      ...recipeIR.entities,
      ...menuIR.entities,
      ...prepListIR.entities,
    ],
    enums: [
      ...(prepTaskIR.enums || []),
      ...(stationIR.enums || []),
      ...(inventoryIR.enums || []),
      ...(recipeIR.enums || []),
      ...(menuIR.enums || []),
      ...(prepListIR.enums || []),
    ],
    stores: [
      ...(prepTaskIR.stores || []),
      ...(stationIR.stores || []),
      ...(inventoryIR.stores || []),
      ...(recipeIR.stores || []),
      ...(menuIR.stores || []),
      ...(prepListIR.stores || []),
    ],
    events: [
      ...prepTaskIR.events,
      ...stationIR.events,
      ...inventoryIR.events,
      ...recipeIR.events,
      ...menuIR.events,
      ...prepListIR.events,
    ],
    commands: [
      ...prepTaskIR.commands,
      ...stationIR.commands,
      ...inventoryIR.commands,
      ...recipeIR.commands,
      ...menuIR.commands,
      ...prepListIR.commands,
    ],
    policies: [
      ...prepTaskIR.policies,
      ...stationIR.policies,
      ...inventoryIR.policies,
      ...recipeIR.policies,
      ...menuIR.policies,
      ...prepListIR.policies,
    ],
    values: [],
  };

  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(combinedIR, context, options);
  return engine;
}

/**
 * Build runtime options from context
 */
function buildRuntimeOptions(context: KitchenOpsContext) {
  return context.storeProvider ||
    context.databaseUrl ||
    context.telemetry ||
    context.evaluationLimits ||
    context.deterministicMode
    ? {
        ...(context.storeProvider && {
          storeProvider: context.storeProvider,
        }),
        ...(context.databaseUrl &&
          !context.storeProvider && {
            storeProvider: createPostgresStoreProvider(
              context.databaseUrl,
              context.tenantId
            ),
          }),
        ...(context.telemetry && { telemetry: context.telemetry }),
        ...(context.evaluationLimits && {
          evaluationLimits: context.evaluationLimits,
        }),
        ...(context.deterministicMode !== undefined && {
          deterministicMode: context.deterministicMode,
        }),
      }
    : undefined;
}
