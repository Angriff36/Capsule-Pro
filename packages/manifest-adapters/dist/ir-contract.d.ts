import type { IR } from "@angriff36/manifest/ir";
/**
 * Enforces command ownership invariants required by runtime and projection code.
 *
 * Compiler output should eventually satisfy this without repair; until then, this
 * function is the single compatibility boundary for command ownership metadata.
 *
 * @param ir - The IR to normalize
 * @param manifestName - Optional manifest name for command ownership fallback
 */
export declare function enforceCommandOwnership(ir: IR, manifestName?: string): IR;
//# sourceMappingURL=ir-contract.d.ts.map