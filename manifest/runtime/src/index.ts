/**
 * Kitchen Ops Manifest Runtime
 *
 * This module provides a runtime for executing kitchen operations commands
 * using the Manifest language. It handles prep tasks, station management,
 * and inventory operations with proper constraint checking and event emission.
 *
 * ℹ️ Code Generation Workflow (Preferred for New Features)
 * =========================================================
 * For new Manifest features, consider using the code generator:
 *
 * 1. Edit .manifest file in manifest/source/
 * 2. Run: npx tsx packages/manifest/bin/compile.ts <file>.manifest --output ./generated
 * 3. Review and use the generated code
 * 4. See .specify/memory/AGENTS.md for when to use code generation vs manual integration
 *
 * ⚠️ Constraint Handling Pattern
 * ===========================================
 * When using this runtime, you MUST check constraint outcomes:
 *
 * 1. createInstance() returns undefined when constraints fail
 * 2. executeCommand() returns CommandResult with constraint outcomes
 * 3. See .specify/memory/AGENTS.md for full pattern documentation
 * 4. Tests at apps/api/__tests__/kitchen/manifest-constraints.test.ts verify this
 */

// ============ Prisma Store Exports ============

export {
  createPrismaStoreProvider,
  PrepTaskPrismaStore,
  StationPrismaStore,
} from "./prisma-store";

// ============ Optional Feature Modules ============

export * from "./manifest-telemetry-collector";
export * from "./permission-checker";
export * from "./permission-guard";
export * from "./prep-task-dependency-engine";
