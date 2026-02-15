import { RuntimeEngine } from "@manifest/runtime";
import type { IRCommand } from "@manifest/runtime/ir";
/**
 * Compatibility layer until compiler output always includes command owners.
 * This keeps command lookup authoritative on IR root commands.
 */
export declare class ManifestRuntimeEngine extends RuntimeEngine {
    getCommand(name: string, entityName?: string): IRCommand | undefined;
}
//# sourceMappingURL=runtime-engine.d.ts.map