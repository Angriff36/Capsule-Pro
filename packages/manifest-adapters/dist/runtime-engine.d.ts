import { RuntimeEngine } from "@angriff36/manifest";
import type { IRCommand } from "@angriff36/manifest/ir";
/**
 * Compatibility layer until compiler output always includes command owners.
 * This keeps command lookup authoritative on IR root commands.
 */
export declare class ManifestRuntimeEngine extends RuntimeEngine {
    getCommand(name: string, entityName?: string): IRCommand | undefined;
}
//# sourceMappingURL=runtime-engine.d.ts.map