import type { IR } from "@manifest/runtime/ir";
/**
 * Enforces command ownership invariants required by runtime and projection code.
 *
 * Compiler output should eventually satisfy this without repair; until then, this
 * function is the single compatibility boundary for command ownership metadata.
 */
export declare function enforceCommandOwnership(ir: IR): IR;
//# sourceMappingURL=ir-contract.d.ts.map