/**
 * Runtime Factories
 *
 * Factory functions for creating kitchen operations runtimes
 */

import type { IR } from "@angriff36/manifest/ir";
import { mergeIR } from "@angriff36/manifest/multi-compiler";
import { ManifestRuntimeEngine } from "../runtime-engine";
import {
  loadInventoryManifestIR,
  loadMenuManifestIR,
  loadPrepListManifestIR,
  loadPrepTaskManifestIR,
  loadRecipeManifestIR,
  loadStationManifestIR,
} from "./manifest-ir-loader";
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

  // Use native mergeIR — carries all sections (sagas, reactions, webhooks, schedules)
  // instead of hand-concatenating only known keys.
  const combinedIR: IR = mergeIR([
    prepTaskIR,
    stationIR,
    inventoryIR,
    recipeIR,
    menuIR,
    prepListIR,
  ]);

  const options = buildRuntimeOptions(context);
  const engine = new ManifestRuntimeEngine(combinedIR, context, options);
  return engine;
}

/**
 * Build runtime options from context
 */
function buildRuntimeOptions(context: KitchenOpsContext) {
  return context.storeProvider ||
    context.telemetry ||
    context.evaluationLimits ||
    context.deterministicMode
    ? {
        ...(context.storeProvider && {
          storeProvider: context.storeProvider,
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
