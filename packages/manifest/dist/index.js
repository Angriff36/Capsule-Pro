/**
 * @repo/manifest
 *
 * Manifest Language Runtime and Compiler
 *
 * Usage:
 *   import { RuntimeEngine, compileToIR } from '@repo/manifest';
 *   import type { IR, CommandResult } from '@repo/manifest';
 */
// Export event import runtime helpers
export { createEventImportRuntime, createOrUpdateEvent, generateBattleBoard, generateChecklist, processDocumentImport, setupEventListeners, } from "./event-import-runtime.js";
// Export Capsule-Pro projection generator
export { generateCapsuleProRouteHandler, } from "./generators/capsule-pro.js";
// Export constants
export { OVERRIDE_REASON_CODES } from "./manifest/ir.js";
// Export compiler
export { compileToIR } from "./manifest/ir-compiler.js";
// Export runtime engine
export { RuntimeEngine, } from "./manifest/runtime-engine.js";
