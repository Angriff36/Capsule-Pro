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
// CompileToIRResult is defined in ir.ts
// Export types
export type {
  CompileToIRResult,
  IR,
  IRAction,
  IRCommand,
  IRComputedProperty,
  IRConstraint,
  IRDiagnostic,
  IREntity,
  IREvent,
  IREventField,
  IRExpression,
  IRModule,
  IRParameter,
  IRPolicy,
  IRProperty,
  IRRelationship,
  IRStore,
  IRType,
  IRValue,
  PropertyModifier,
} from "./manifest/ir";
// Export compiler
export { compileToIR } from "./manifest/ir-compiler";
// Export runtime engine
export {
  type CommandResult,
  type EmittedEvent,
  type EntityInstance,
  type GuardFailure,
  type GuardResolvedValue,
  type RuntimeContext,
  RuntimeEngine,
  type RuntimeOptions,
  type Store,
} from "./manifest/runtime-engine";
