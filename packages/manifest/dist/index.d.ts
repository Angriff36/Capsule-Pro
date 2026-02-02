/**
 * @repo/manifest
 *
 * Manifest Language Runtime and Compiler
 *
 * Usage:
 *   import { RuntimeEngine, compileToIR } from '@repo/manifest';
 *   import type { IR, CommandResult } from '@repo/manifest';
 */
export { RuntimeEngine, type RuntimeContext, type RuntimeOptions, type EntityInstance, type CommandResult, type GuardFailure, type GuardResolvedValue, type EmittedEvent, type Store, } from './manifest/runtime-engine';
export { compileToIR, } from './manifest/ir-compiler';
export type { CompileToIRResult, } from './manifest/ir';
export type { IR, IRModule, IREntity, IRProperty, IRComputedProperty, IRRelationship, IRConstraint, IRStore, IREvent, IREventField, IRCommand, IRParameter, IRAction, IRPolicy, IRType, IRValue, IRExpression, IRDiagnostic, PropertyModifier, } from './manifest/ir';
export { createEventImportRuntime, processDocumentImport, createOrUpdateEvent, generateBattleBoard, generateChecklist, setupEventListeners, } from './event-import-runtime';
//# sourceMappingURL=index.d.ts.map