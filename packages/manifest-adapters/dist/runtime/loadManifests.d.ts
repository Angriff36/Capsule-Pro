import type { IR } from "@angriff36/manifest/ir";
export interface ManifestFile {
    name: string;
    content: string;
}
export interface LoadedManifestSet {
    files: ManifestFile[];
    hash: string;
}
export interface CompiledManifestBundle {
    files: ManifestFile[];
    hash: string;
    ir: IR;
}
interface LoadManifestOptions {
    manifestsDir?: string;
    forceReload?: boolean;
}
interface CompileBundleOptions extends LoadManifestOptions {
    forceRecompile?: boolean;
}
export declare function loadManifests(options?: LoadManifestOptions): Promise<LoadedManifestSet>;
export declare function getCompiledManifestBundle(options?: CompileBundleOptions): Promise<CompiledManifestBundle>;
/**
 * Load a precompiled IR JSON file and return it as a CompiledManifestBundle.
 *
 * The irPath is resolved relative to the monorepo root (not process.cwd()),
 * so it works correctly when Next.js runs from apps/api.
 *
 * @param irPath - Repo-root-relative path to the precompiled IR JSON.
 *   Example: "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
 */
export declare function loadPrecompiledIR(irPath: string): CompiledManifestBundle;
export {};
//# sourceMappingURL=loadManifests.d.ts.map