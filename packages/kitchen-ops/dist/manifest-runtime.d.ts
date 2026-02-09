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
export declare function createPrepTaskManifestRuntime(ctx: GeneratedRuntimeContext): Promise<any>;
export declare function createStationManifestRuntime(ctx: GeneratedRuntimeContext): Promise<any>;
export declare function createInventoryManifestRuntime(ctx: GeneratedRuntimeContext): Promise<any>;
export declare function createRecipeManifestRuntime(ctx: GeneratedRuntimeContext): Promise<any>;
export declare function createMenuManifestRuntime(ctx: GeneratedRuntimeContext): Promise<any>;
export declare function createPrepListManifestRuntime(ctx: GeneratedRuntimeContext): Promise<any>;
export {};
//# sourceMappingURL=manifest-runtime.d.ts.map