/**
 * Manifest runtime factory adapters for generated command handlers.
 *
 * Generated command handlers call `createManifestRuntime({ user: { id, tenantId } })`.
 * These adapters bridge that shape to the KitchenOpsContext expected by each domain factory.
 *
 * One factory per .manifest file. Import the one matching the command's domain.
 */

import {
  createInventoryRuntime,
  createMenuRuntime,
  createPrepListRuntime,
  createPrepTaskRuntime,
  createRecipeRuntime,
  createStationRuntime,
} from "./index.js";

interface GeneratedRuntimeContext {
  user: {
    id: string;
    tenantId: string;
  };
}

export function createPrepTaskManifestRuntime(ctx: GeneratedRuntimeContext) {
  return createPrepTaskRuntime({
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
}

export function createStationManifestRuntime(ctx: GeneratedRuntimeContext) {
  return createStationRuntime({
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
}

export function createInventoryManifestRuntime(ctx: GeneratedRuntimeContext) {
  return createInventoryRuntime({
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
}

export function createRecipeManifestRuntime(ctx: GeneratedRuntimeContext) {
  return createRecipeRuntime({
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
}

export function createMenuManifestRuntime(ctx: GeneratedRuntimeContext) {
  return createMenuRuntime({
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
}

export function createPrepListManifestRuntime(ctx: GeneratedRuntimeContext) {
  return createPrepListRuntime({
    userId: ctx.user.id,
    tenantId: ctx.user.tenantId,
  });
}
