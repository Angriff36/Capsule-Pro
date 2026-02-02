/**
 * @repo/manifest
 *
 * Manifest Language Runtime and Compiler
 *
 * Usage:
 *   import { RuntimeEngine, compileToIR } from '@repo/manifest';
 *   import type { IR, CommandResult } from '@repo/manifest';
 */
// Export runtime engine
export { RuntimeEngine, } from './manifest/runtime-engine';
// Export compiler
export { compileToIR, } from './manifest/ir-compiler';
// Export event import runtime helpers
export { createEventImportRuntime, processDocumentImport, createOrUpdateEvent, generateBattleBoard, generateChecklist, setupEventListeners, } from './event-import-runtime';
