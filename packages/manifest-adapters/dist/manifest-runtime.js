/**
 * Manifest runtime factory adapters for generated command handlers.
 *
 * Generated command handlers call `createManifestRuntime({ user: { id, tenantId } })`.
 * These adapters bridge that shape to the KitchenOpsContext expected by each domain factory.
 *
 * One factory per .manifest file. Import the one matching the command's domain.
 */
import { createInventoryRuntime, createMenuRuntime, createPrepListRuntime, createPrepTaskRuntime, createRecipeRuntime, createStationRuntime, } from "./index.js";
export function createPrepTaskManifestRuntime(ctx) {
    return createPrepTaskRuntime({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
    });
}
export function createStationManifestRuntime(ctx) {
    return createStationRuntime({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
    });
}
export function createInventoryManifestRuntime(ctx) {
    return createInventoryRuntime({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
    });
}
export function createRecipeManifestRuntime(ctx) {
    return createRecipeRuntime({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
    });
}
export function createMenuManifestRuntime(ctx) {
    return createMenuRuntime({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
    });
}
export function createPrepListManifestRuntime(ctx) {
    return createPrepListRuntime({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
    });
}
