/**
 * Manifest runtime factory adapters for generated command handlers.
 *
 * Generated command handlers call `createManifestRuntime({ user: { id, tenantId } })`.
 * These adapters bridge that shape to the KitchenOpsContext expected by each domain factory.
 *
 * One factory per .manifest file. Import the one matching the command's domain.
 */
interface GeneratedRuntimeContext {
    user: {
        id: string;
        tenantId: string;
    };
}
export declare function createPrepTaskManifestRuntime(ctx: GeneratedRuntimeContext): Promise<import("@repo/manifest").RuntimeEngine>;
export declare function createStationManifestRuntime(ctx: GeneratedRuntimeContext): Promise<import("@repo/manifest").RuntimeEngine>;
export declare function createInventoryManifestRuntime(ctx: GeneratedRuntimeContext): Promise<import("@repo/manifest").RuntimeEngine>;
export declare function createRecipeManifestRuntime(ctx: GeneratedRuntimeContext): Promise<import("@repo/manifest").RuntimeEngine>;
export declare function createMenuManifestRuntime(ctx: GeneratedRuntimeContext): Promise<import("@repo/manifest").RuntimeEngine>;
export declare function createPrepListManifestRuntime(ctx: GeneratedRuntimeContext): Promise<import("@repo/manifest").RuntimeEngine>;
export {};
//# sourceMappingURL=manifest-runtime.d.ts.map