/**
 * @repo/manifest
 *
 * Manifest Language Runtime and Compiler
 *
 * Usage:
 *   import { RuntimeEngine, compileToIR } from '@repo/manifest';
 *   import type { IR, CommandResult } from '@repo/manifest';
 */
export { createEventImportRuntime, createOrUpdateEvent, generateBattleBoard, generateChecklist, processDocumentImport, setupEventListeners, } from "./event-import-runtime";
export type { CompileToIRResult, ConstraintOutcome, IR, IRAction, IRCommand, IRComputedProperty, IRConstraint, IRDiagnostic, IREntity, IREvent, IREventField, IRExpression, IRModule, IRParameter, IRPolicy, IRProperty, IRRelationship, IRStore, IRType, IRValue, OverrideRequest, PropertyModifier, } from "./manifest/ir";
export { compileToIR } from "./manifest/ir-compiler";
export { type CommandResult, type EmittedEvent, type EntityInstance, type GuardFailure, type GuardResolvedValue, type RuntimeContext, RuntimeEngine, type RuntimeOptions, type Store, } from "./manifest/runtime-engine";
//# sourceMappingURL=index.d.ts.map