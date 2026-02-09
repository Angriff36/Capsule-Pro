/**
 * @repo/manifest
 *
 * Manifest Language Runtime and Compiler
 *
 * Usage:
 *   import { RuntimeEngine, compileToIR } from '@repo/manifest';
 *   import type { IR, CommandResult } from '@repo/manifest';
 */
export { createEventImportRuntime, createOrUpdateEvent, generateBattleBoard, generateChecklist, processDocumentImport, setupEventListeners, } from "./event-import-runtime.js";
export { type CapsuleProGeneratorOptions, generateCapsuleProRouteHandler, type RouteOperation, } from "./generators/capsule-pro.js";
export type { CompileToIRResult, ConstraintOutcome, IR, IRAction, IRCommand, IRComputedProperty, IRConstraint, IRDiagnostic, IREntity, IREvent, IREventField, IRExpression, IRModule, IRParameter, IRPolicy, IRProperty, IRRelationship, IRStore, IRType, IRValue, OverrideReasonCode, OverrideRequest, PropertyModifier, } from "./manifest/ir.js";
export { OVERRIDE_REASON_CODES } from "./manifest/ir.js";
export { compileToIR } from "./manifest/ir-compiler.js";
export { type CommandResult, type EmittedEvent, type EntityInstance, type GuardFailure, type GuardResolvedValue, type RuntimeContext, RuntimeEngine, type RuntimeOptions, type Store, } from "./manifest/runtime-engine.js";
//# sourceMappingURL=index.d.ts.map