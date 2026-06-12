import type { CommandResult, RuntimeContext, Store } from "@angriff36/manifest";

/**
 * Kitchen Ops Runtime Context
 */
export interface KitchenOpsContext extends RuntimeContext {
  causationId?: string;
  /**
   * Optional workflow metadata for event correlation and tracing.
   * @example
   * ```typescript
   * {
   *   correlationId: 'evt-123', // Groups all operations in this event workflow
   *   causationId: 'schedule-evt-123' // Links to triggering event
   * }
   * ```
   */
  correlationId?: string;
  /**
   * Optional connection string for PostgresStore.
   * If provided, entities will be persisted in PostgreSQL.
   * Defaults to undefined (in-memory storage).
   *
   * @deprecated Use `storeProvider` with `createPrismaStoreProvider` for better
   * integration with existing Prisma schema.
   */
  databaseUrl?: string;
  /**
   * Optional deterministic mode to block adapter side effects (for testing/replay).
   * When true, persist/publish/effect actions throw ManifestEffectBoundaryError.
   * @default false
   */
  deterministicMode?: boolean;
  /**
   * Optional evaluation limits to protect against runaway expressions.
   * @default { maxExpressionDepth: 64, maxEvaluationSteps: 10_000 }
   */
  evaluationLimits?: {
    maxExpressionDepth?: number;
    maxEvaluationSteps?: number;
  };
  /**
   * Optional store provider for entity persistence.
   * If provided, entities will be persisted using this store.
   * Use `createPrismaStoreProvider(prisma, tenantId)` for Prisma-backed storage.
   * Defaults to undefined (in-memory storage).
   */
  storeProvider?: (entityName: string) => Store | undefined;
  /**
   * Optional telemetry callbacks for observability.
   * Use this to integrate with Sentry, Logtail, or other telemetry services.
   *
   * @example
   * ```typescript
   * import * as Sentry from '@sentry/nextjs';
   *
   * const runtime = await createPrepTaskRuntime({
   *   ...context,
   *   telemetry: {
   *     onConstraintEvaluated: (outcome, commandName, entityName) => {
   *       if (outcome.severity !== 'ok') {
   *         Sentry.metrics.increment('manifest.constraint.evaluated', 1, {
   *           tags: {
   *             severity: outcome.severity,
   *             passed: String(outcome.passed),
   *             overridden: String(outcome.overridden),
   *             entity: entityName || 'unknown',
   *             command: commandName
   *           }
   *         });
   *       }
   *     },
   *     onOverrideApplied: (constraint, overrideReq, outcome, commandName) => {
   *       Sentry.metrics.increment('manifest.override.applied', 1, {
   *         tags: {
   *           constraintCode: constraint.code,
   *           severity: outcome.severity,
   *           command: commandName
   *         }
   *       });
   *     },
   *     onCommandExecuted: (command, result, entityName) => {
   *       if (!result.success) {
   *         Sentry.metrics.increment('manifest.command.failed', 1, {
   *           tags: { entity: entityName || 'unknown', command: command.name }
   *         });
   *       }
   *       const blockedCount = result.constraintOutcomes?.filter(
   *         o => !o.passed && !o.overridden && o.severity === 'block'
   *       ).length ?? 0;
   *       const warnCount = result.constraintOutcomes?.filter(
   *         o => !o.passed && o.severity === 'warn'
   *       ).length ?? 0;
   *       if (blockedCount > 0 || warnCount > 0) {
   *         Sentry.metrics.increment('manifest.constraint.blocked', blockedCount, {
   *           tags: { entity: entityName || 'unknown' }
   *         });
   *         Sentry.metrics.increment('manifest.constraint.warn', warnCount, {
   *           tags: { entity: entityName || 'unknown' }
   *         });
   *       }
   *     }
   *   }
   * });
   * ```
   */
  telemetry?: {
    onConstraintEvaluated?: (
      outcome: Readonly<import("@angriff36/manifest/ir").ConstraintOutcome>,
      commandName: string,
      entityName?: string
    ) => void;
    onOverrideApplied?: (
      constraint: Readonly<import("@angriff36/manifest/ir").IRConstraint>,
      overrideReq: Readonly<import("@angriff36/manifest/ir").OverrideRequest>,
      outcome: Readonly<import("@angriff36/manifest/ir").ConstraintOutcome>,
      commandName: string
    ) => void;
    onCommandExecuted?: (
      command: Readonly<import("@angriff36/manifest/ir").IRCommand>,
      result: Readonly<import("@angriff36/manifest").CommandResult>,
      entityName?: string
    ) => void;
  };
  tenantId: string;
  userId: string;
  userRole?: string;
}

/**
 * Result of a prep task command
 */
export interface PrepTaskCommandResult extends CommandResult {
  claimedAt?: number;
  claimedBy?: string;
  status?: string;
  taskId: string;
}

/**
 * Result of a station command
 */
export interface StationCommandResult extends CommandResult {
  capacity?: number;
  currentTaskCount?: number;
  stationId: string;
}

/**
 * Result of an inventory command
 */
export interface InventoryCommandResult extends CommandResult {
  itemId: string;
  quantityAvailable?: number;
  quantityOnHand?: number;
  quantityReserved?: number;
}

/**
 * Result of a recipe command
 */
export interface RecipeCommandResult extends CommandResult {
  isActive?: boolean;
  name?: string;
  recipeId: string;
}

/**
 * Result of a dish command
 */
export interface DishCommandResult extends CommandResult {
  costPerPerson?: number;
  dishId: string;
  name?: string;
  pricePerPerson?: number;
}

/**
 * Result of a menu command
 */
export interface MenuCommandResult extends CommandResult {
  isActive?: boolean;
  menuId: string;
  name?: string;
}

/**
 * Result of a menu dish command
 */
export interface MenuDishCommandResult extends CommandResult {
  dishId?: string;
  menuDishId: string;
  menuId?: string;
}

/**
 * Result of a prep list command
 */
export interface PrepListCommandResult extends CommandResult {
  name?: string;
  prepListId: string;
  status?: string;
  totalEstimatedTime?: number;
  totalItems?: number;
}

/**
 * Result of a prep list item command
 */
export interface PrepListItemCommandResult extends CommandResult {
  ingredientName?: string;
  isCompleted?: boolean;
  itemId: string;
  prepListId: string;
}

/**
 * Workflow metadata options for runCommand calls.
 * These are passed through to enable event correlation and tracing.
 */
export interface WorkflowMetadataOptions {
  causationId?: string;
  correlationId?: string;
  idempotencyKey?: string;
}
