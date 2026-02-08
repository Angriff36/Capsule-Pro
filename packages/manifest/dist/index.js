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
export {
  createEventImportRuntime,
  createOrUpdateEvent,
  generateBattleBoard,
  generateChecklist,
  processDocumentImport,
  setupEventListeners,
} from "./event-import-runtime";
// Export Capsule-Pro projection generator
export { generateCapsuleProRouteHandler } from "./generators/capsule-pro";
// Export constants
export { OVERRIDE_REASON_CODES } from "./manifest/ir";
// Export compiler
export { compileToIR } from "./manifest/ir-compiler";
// Export runtime engine
export { RuntimeEngine } from "./manifest/runtime-engine";
