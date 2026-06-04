/**
 * Shared manifest runtime factory.
 *
 * This is the ONE canonical implementation of `createManifestRuntime`.
 * Both `apps/api` and `apps/app` use this factory — the only difference
 * is which concrete singletons they inject for prisma, logging, telemetry,
 * and error capture.
 *
 * This module must NOT import:
 *   - `@repo/database`  (injected as deps.prisma)
 *   - `@sentry/nextjs`  (injected as deps.captureException)
 *   - `@repo/observability/log` (injected as deps.log)
 *
 * @packageDocumentation
 */

import type {
  CommandResult,
  EmittedEvent,
  Middleware,
  RuntimeEngine,
  RuntimeOptions,
} from "@angriff36/manifest";
import { PostgresAuditSink } from "@angriff36/manifest/audit/postgres";
import type { IR, IRCommand } from "@angriff36/manifest/ir";
import { PostgresOutboxStore } from "@angriff36/manifest/outbox/postgres";
import { createCustomBuiltins } from "./manifest-builtins";
import {
  createIdentityMiddleware,
  createPrepInventoryDemandMiddleware,
  createRbacMiddleware,
} from "./middleware";
import { loadRolePolicies } from "./permission-guard";
import { ensureManifestSchema, getPool } from "./pg-pool";
import { PrismaIdempotencyStore } from "./prisma-idempotency-store";
import { PrismaJsonStore } from "./prisma-json-store";
import type { PrismaStoreConfig } from "./prisma-store";
import { createPrismaOutboxWriter, PrismaStore } from "./prisma-store";
import { loadMergedPrecompiledIR, loadPrecompiledIR } from "./runtime/loadManifests";
import { ManifestRuntimeEngine } from "./runtime-engine";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimal structural type for the full Prisma client.
 * Includes $transaction for outbox writes when no override is provided.
 * Role resolution has moved to identity-middleware.ts; the user.findFirst
 * signature here is kept for consumers that still reference it.
 */
export interface PrismaLike {
  user: {
    findFirst: (args: {
      where: { id: string; tenantId: string; deletedAt: null };
      select: { role: true };
    }) => Promise<{ role: string | null } | null>;
  };
  // biome-ignore lint/suspicious/noExplicitAny: Prisma has overloaded $transaction signatures.
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
}

/**
 * Type for transaction client passed as prismaOverride.
 * Transaction clients omit $transaction since nesting is not allowed.
 * The factory only uses this client for entity writes (store + outbox),
 * not for lookups (which use the main prisma client).
 */
// biome-ignore lint/suspicious/noExplicitAny: Transaction client shape varies by Prisma version; callers inject structurally-compatible clients.
export type PrismaTransactionClient = any;

/** Minimal structured logger the factory needs. */
export interface ManifestRuntimeLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Telemetry hooks wired into the runtime engine context.
 *
 * Uses method syntax (not function-property syntax) so that callers can
 * inject implementations with narrower parameter types without tripping
 * `strictFunctionTypes` contravariance checks.
 */
export interface ManifestTelemetryHooks {
  onConstraintEvaluated?(
    outcome: unknown,
    commandName: string,
    entityName?: string
  ): void;
  onOverrideApplied?(
    constraint: unknown,
    overrideReq: unknown,
    outcome: unknown,
    commandName: string
  ): void;
  onCommandExecuted?(
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ): void | Promise<void>;
}

/** Dependencies injected by the calling app. */
export interface CreateManifestRuntimeDeps {
  /** Prisma client instance (the app's singleton). */
  prisma: PrismaLike;
  /**
   * Optional Prisma override for transaction-aware operations.
   * When provided (typically a transaction client from $transaction callback),
   * ALL internal Prisma operations use this client instead of `prisma`.
   * This enables atomic multi-entity writes in composite routes.
   */
  prismaOverride?: PrismaTransactionClient;
  /** Structured logger. */
  log: ManifestRuntimeLogger;
  /** Error capture function (e.g. Sentry.captureException). Returns event id. */
  // biome-ignore lint/suspicious/noExplicitAny: Must accept Sentry's captureException signature which uses a specific hint type, not `unknown`.
  captureException: (err: unknown, context?: any) => unknown;
  /** Telemetry hooks for observability. */
  telemetry?: ManifestTelemetryHooks;
  /** Idempotency configuration (Phase 2: failureTtlMs plumbing). */
  idempotency?: { failureTtlMs?: number };
}

/** Context passed by the caller describing the acting user. */
export interface ManifestRuntimeContext {
  user: {
    id: string;
    tenantId: string;
    role?: string;
  };
  entityName?: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/**
 * Entities that have dedicated Prisma models with hand-written field mappings.
 * All other entities fall back to the generic PrismaJsonStore (JSON blob storage).
 */
/** Dedupe JsonStore notices — storeProvider runs per entity per runtime. */
const loggedJsonStoreEntities = new Set<string>();

const ENTITIES_WITH_SPECIFIC_STORES = new Set([
  "PrepTask",
  "Recipe",
  "RecipeVersion",
  "Ingredient",
  "RecipeIngredient",
  "RecipeStep",
  "Dish",
  "Menu",
  "MenuDish",
  "PrepList",
  "PrepListItem",
  "Station",
  "InventoryItem",
  "KitchenTask",
  "Event",
  "EmailTemplate",
  "PrepTaskPlanWorkflow",
  "AlertsConfig",
  "PrepMethod",
  "Container",
  "WasteEntry",
  "Workflow",
  "AdminChatParticipant",
  "AdminTask",
  "ApiKey",
  "BattleBoard",
  "BudgetAlert",
  "BudgetLineItem",
  "BulkOrderRule",
  "CateringOrder",
  "ChartOfAccount",
  "Client",
  "ClientContact",
  "ClientInteraction",
  "ClientPreference",
  "CommandBoard",
  "CommandBoardCard",
  "CommandBoardConnection",
  "CommandBoardGroup",
  "CommandBoardLayout",
  "ContractSignature",
  "CycleCountRecord",
  "CycleCountSession",
  "EmailWorkflow",
  "EmployeeAvailability",
  "EmployeeCertification",
  "EmployeeDeduction",
  "EventBudget",
  "EventContract",
  "EventDish",
  "EventGuest",
  "EventImportWorkflow",
  "EventProfitability",
  "EventReport",
  "EventStaff",
  "StaffMember",
  "EventSummary",
  "InventorySupplier",
  "AllergenWarning",
  "InventoryTransaction",
  "LaborBudget",
  "Lead",
  "OverrideAudit",
  "PayrollApprovalHistory",
  "PayrollPeriod",
  "PayrollRun",
  "PrepComment",
  "PricingTier",
  "TimeEntry",
  "TimecardEditRequest",
  "TrainingAssignment",
  "TrainingModule",
  "User",
  "VarianceReport",
  "VendorCatalog",
  "VendorContract",
  "PurchaseOrder",
  "PurchaseOrderItem",
  "Proposal",
  "ProposalLineItem",
  "Schedule",
  "ScheduleShift",
  "ShipmentItem",
  "Shipment",
  "Notification",
  "PurchaseRequisition",
  "Invoice",
  "PaymentMethod",
  "Payment",
  "CollectionCase",
  "CollectionAction",
  "CollectionPaymentPlan",
  "RolePolicy",
  "TimeOffRequest",
  "InventoryTransfer",
]);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Load merged precompiled IR from `manifest/ir/*.ir.json` via the official
 * `@angriff36/manifest` IR types. Optional irPath loads a single file for tests.
 */
function getManifestIR(irPath?: string): IR {
  if (irPath) {
    return loadPrecompiledIR(irPath).ir;
  }
  return loadMergedPrecompiledIR().ir;
}

// Role resolution moved to identity-middleware.ts (before-policy lifecycle hook).
// See manifest/runtime/src/middleware/identity-middleware.ts.

// ---------------------------------------------------------------------------
// Factory (the ONE implementation)
// ---------------------------------------------------------------------------

/**
 * Create a manifest runtime with Prisma-based storage and transactional outbox.
 *
 * This is the single canonical factory. Both `apps/api` and `apps/app` call
 * this function — the only difference is which concrete singletons they inject.
 *
 * @example
 * ```typescript
 * // In apps/api (thin shim):
 * import { createManifestRuntime as createShared } from "@repo/manifest-runtime/manifest-runtime-factory";
 * import { database } from "@repo/database";
 * import { log } from "@repo/observability/log";
 * import { captureException } from "@sentry/nextjs";
 *
 * export function createManifestRuntime(ctx) {
 *   return createShared(
 *     { prisma: database, log, captureException, telemetry: sentryTelemetry },
 *     ctx,
 *   );
 * }
 * ```
 */
export async function createManifestRuntime(
  deps: CreateManifestRuntimeDeps,
  ctx: ManifestRuntimeContext
): Promise<RuntimeEngine> {
  if (process.env.NEXT_RUNTIME === "edge") {
    throw new Error(
      "Manifest runtime requires Node.js runtime (Edge runtime is unsupported)."
    );
  }

  // CRITICAL: Use the MAIN prisma client for internal lookups (user role resolution).
  // Using the transaction client (prismaOverride) for lookups can poison Neon transactions
  // when the lookup fails or returns unexpected results.
  // The transaction client should ONLY be used for user-requested writes.
  const prismaForLookups = deps.prisma;

  // Use override client for writes when provided (for atomic multi-entity writes)
  const prismaForWrites = deps.prismaOverride ?? deps.prisma;

  // 1. Identity enrichment runs inside the Manifest lifecycle via middleware.
  //    The createIdentityMiddleware (before-policy hook) resolves the user's
  //    role from the database and injects it into both runtimeContext.user.role
  //    and context.userRole for policy/guard expression evaluation.
  //    See: manifest/runtime/src/middleware/identity-middleware.ts
  const user = ctx.user;

  // 2. Load precompiled IR.
  const ir = getManifestIR();

  // 3. Create a shared event collector for transactional outbox pattern.
  const eventCollector: EmittedEvent[] = [];

  // 4. Build the store provider — entities with dedicated Prisma models use
  //    PrismaStore; everything else falls back to PrismaJsonStore.
  const storeProvider: RuntimeOptions["storeProvider"] = (
    entityName: string
  ) => {
    if (ENTITIES_WITH_SPECIFIC_STORES.has(entityName)) {
      const outboxWriter = createPrismaOutboxWriter(
        entityName,
        user.tenantId
      );

      // biome-ignore lint/suspicious/noExplicitAny: PrismaStoreConfig expects the full PrismaClient; callers inject a structurally-compatible superset.
      const config: PrismaStoreConfig = {
        prisma: prismaForWrites as any,
        entityName,
        tenantId: user.tenantId,
        outboxWriter,
        eventCollector,
        // userId — surfaced for entity stores that audit-derive caller
        // identity (e.g. InventoryTransfer.requestedBy). Most stores ignore.
        userId: user.id,
      };

      return new PrismaStore(config);
    }

    // Fall back to generic JSON store for entities without dedicated models.
    if (!loggedJsonStoreEntities.has(entityName)) {
      loggedJsonStoreEntities.add(entityName);
      deps.log.info(
        `[manifest-runtime] Using PrismaJsonStore for entity: ${entityName}`
      );
    }
    // biome-ignore lint/suspicious/noExplicitAny: PrismaJsonStore expects the full PrismaClient; callers inject a structurally-compatible superset.
    return new PrismaJsonStore({
      prisma: prismaForWrites as any,
      tenantId: user.tenantId,
      entityType: entityName,
    });
  };

  // 5. Build telemetry hooks — pass through caller-provided telemetry only.
  //    Outbox event persistence is now handled by the audit middleware (step 8),
  //    which runs inside the engine lifecycle at the after-emit hook instead of
  //    via post-hoc telemetry hooks. This separates observability (telemetry)
  //    from durability (outbox writes).
  const telemetry: ManifestTelemetryHooks = {
    onConstraintEvaluated: deps.telemetry?.onConstraintEvaluated,
    onOverrideApplied: deps.telemetry?.onOverrideApplied,
    onCommandExecuted: async (
      command: Readonly<IRCommand>,
      result: Readonly<CommandResult>,
      entityName?: string
    ) => {
      // Fire caller-provided telemetry (e.g. Sentry metrics).
      deps.telemetry?.onCommandExecuted?.(command, result, entityName);
    },
  };

  // 6. Idempotency store for command deduplication.
  //    IMPORTANT: The runtime engine REJECTS commands when an idempotency store
  //    is configured but no idempotencyKey is provided. Since generated routes
  //    do NOT pass idempotencyKey, we must NOT create the store by default.
  //    Only create it when the caller explicitly opts in via deps.idempotency.
  //
  //    Phase 2: When generated routes are updated to pass idempotencyKey,
  //    re-enable the default store creation.
  // biome-ignore lint/suspicious/noExplicitAny: PrismaIdempotencyStore expects the full PrismaClient; callers inject a structurally-compatible superset.
  const idempotencyStore = deps.idempotency
    ? new PrismaIdempotencyStore({
        prisma: prismaForWrites as any,
        tenantId: user.tenantId,
      })
    : undefined;

  // 7. Load role policies for RBAC middleware.
  //    Always load policies for the tenant — the identity middleware resolves
  //    the user's role inside the engine lifecycle (before-policy hook), so
  //    the role may not be known at factory construction time. The RBAC
  //    middleware (before-guard) uses these policies against the resolved role.
  const rolePolicies = await loadRolePolicies(
    prismaForLookups as any,
    user.tenantId
  );

  // 8. Build middleware pipeline.
  //    Middleware runs INSIDE the Manifest engine lifecycle, replacing both
  //    the external Proxy wrapper (RBAC) and pre-engine role resolution.
  //    Pipeline order:
  //    - before-policy: Identity enrichment (resolve user role from DB)
  //    - before-guard:  RBAC permission check (command-level authorization)
  //    Note: after-emit audit/outbox persistence is now handled by the engine
  //    natively via auditSink + outboxStore RuntimeOptions (step 9).
  let engine: ManifestRuntimeEngine;
  const middleware: Middleware[] = [
    createIdentityMiddleware({
      prisma: prismaForLookups,
      captureException: deps.captureException,
    }),
    createRbacMiddleware({ rolePolicies }),
    createPrepInventoryDemandMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
  ];

  // 9. Bootstrap upstream Manifest Postgres adapters.
  //    PostgresAuditSink provides durable audit records for every governed
  //    command (constitution §12). PostgresOutboxStore provides production-
  //    grade transactional event persistence with FOR UPDATE SKIP LOCKED
  //    dispatch. Both share the singleton pg.Pool from pg-pool.ts.
  //    Schema bootstrap (CREATE TABLE IF NOT EXISTS) is idempotent.
  //    GRACEFUL: adapters are skipped when DATABASE_URL is absent (test envs,
  //    CI without DB). The engine still works — just without persistent audit
  //    or outbox delivery.
  const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  let auditSink: PostgresAuditSink | undefined;
  let outboxStore: PostgresOutboxStore | undefined;
  if (dbUrl) {
    await ensureManifestSchema();
    const pool = getPool();
    auditSink = new PostgresAuditSink({ pool });
    outboxStore = new PostgresOutboxStore({
      pool,
      projectSubject: true,
    });
  }

  // 10. Assemble the runtime engine.
  //    customBuiltins injects the project's deterministic expression helpers
  //    (daysBetween/percent/containsAny/…) so guards and computed properties
  //    can call them. The middleware pipeline is passed directly to the engine
  //    via RuntimeOptions — no Proxy wrapping needed.
  //    auditSink and outboxStore are the official upstream Postgres adapters,
  //    replacing the previous custom outbox writer middleware.
  //    When undefined (no DB), the engine skips audit/outbox silently.
  engine = new ManifestRuntimeEngine(
    ir,
    { user, tenantId: user.tenantId, eventCollector, telemetry },
    {
      storeProvider,
      idempotencyStore,
      customBuiltins: createCustomBuiltins(),
      middleware,
      requireTenantContext: true,
      ...(auditSink ? { auditSink } : {}),
      ...(outboxStore ? { outboxStore } : {}),
    }
  );

  return engine;
}

// Re-export types that consumers may need.
export type { RuntimeEngine } from "@angriff36/manifest";
