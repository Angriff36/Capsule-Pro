/**
 * Shared manifest runtime factory.
 *
 * NEEDS-RYAN (@angriff36/manifest@3.1.3, PR #78): this 2,050-LOC hand-rolled runtime owner is a
 * DELETION TARGET. Manifest now ships native companion modules (projections/shared/companions)
 * that emit `createManifestRuntime`, plus a full RuntimeOptions surface (middleware, storeProvider,
 * idempotencyStore, auditSink, outboxStore, approvalStore, eventBus, customBuiltins,
 * requireTenantContext, encryptionProvider). The plan is to flip `emitCompanions: true` in
 * manifest.config.yaml, move the binding logic below (Prisma client, auth context, Sentry/log,
 * flags, custom builtins) into a thin Capsule options module, and delete this file. The 4 bespoke
 * stores' business logic must migrate to .manifest source or the options module FIRST (Q002).
 * Decision tracked at canonical/manifest/runtime-native-ownership/. Do not extend this factory
 * with new logic — that increases the migration surface.
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

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  RuntimeEngine,
  RuntimeOptions,
  Store,
} from "@angriff36/manifest";
import { PostgresApprovalStore } from "@angriff36/manifest/approval/postgres";
import { PostgresAuditSink } from "@angriff36/manifest/audit/postgres";
import type { IR, IRCommand } from "@angriff36/manifest/ir";
import type { OutboxStore } from "@angriff36/manifest/outbox";
import {
  ASYNC_REACTION_HANDLER_MAP,
  type AsyncDispatch,
  asyncReactionRegistry,
  createAsyncDispatch,
  PostgresAsyncReactionStore,
} from "./async-reactions";
import { createAesGcmEncryptionProvider } from "./encryption-provider";
import { resolvePrismaModelKey } from "./generated/entity-to-prisma-model.generated";
// LIVE schema metadata (NOT the IR-projection manifest-prisma-store-metadata):
// the projection metadata describes the IR-projected schema whose delegates
// (e.g. "event_staffs") don't exist on the live PrismaClient — GenericPrismaStore
// threw at construction for 173/191 entities. See build-prisma-store-options.mjs.
import { PRISMA_MODEL_METADATA } from "./generated/prisma-model-metadata.generated";
import type { PrismaClientLike } from "./generated/prisma-store-registry.generated";
import { createOutboxAdapter } from "./kitchen/outbox-adapter";
import { createCustomBuiltins } from "./manifest-builtins";
import {
  createChartOfAccountDeactivatedDeactivateChildrenMiddleware,
  createClientInteractionEscalatedNotifyMiddleware,
  createClientInteractionOverdueNotifyMiddleware,
  createCollectionPaymentRecordedInvoiceApplyMiddleware,
  createCollectionWrittenOffInvoiceWriteOffMiddleware,
  createContainerDeactivatedDishClearMiddleware,
  createContractSignedEventConfirmMiddleware,
  createDealLifecyclePropagationMiddleware,
  createDishDeactivatedPruneMiddleware,
  createEmailTemplateDeletedDeactivateSmsRulesMiddleware,
  createEmailTemplateDeletedDeactivateWorkflowsMiddleware,
  createEmployeeCertificationLapsedNotifyMiddleware,
  createEmployeeCertificationLapsedSuspendAvailabilityMiddleware,
  createEventCancelledCascadeMiddleware,
  createEventContractEventActiveGuardMiddleware,
  createEventCreatedClientInteractionMiddleware,
  createEventDishPrepSyncMiddleware,
  createEventFinalizedClientInteractionMiddleware,
  createEventFinalizedFollowupCreateMiddleware,
  createEventFinalizedReleaseReservationMiddleware,
  createEventGuestCountPrepRescaleMiddleware,
  createEventLocationCateringSyncMiddleware,
  createEventStaffActiveGuardMiddleware,
  createEventStaffAssignedNotifyMiddleware,
  createEventUpdatedBoardSyncMiddleware,
  createFacilityWorkOrderAssetStatusMiddleware,
  createIdentityMiddleware,
  createIngredientRecalledQuarantineInventoryMiddleware,
  createInventoryMovementTransactionMiddleware,
  createInventoryStockSyncItemMiddleware,
  createInventoryTransferReceivedStockMovementMiddleware,
  createInvoiceFullyPaidMarkPaidMiddleware,
  createInvoiceOverdueCollectionCaseCreateMiddleware,
  createInvoiceWrittenOffRevRecCancelMiddleware,
  createLaborBudgetActualRecordedAlertMiddleware,
  createLeadConvertedDealCreateMiddleware,
  createLogisticsDispatchDriverVehicleStatusMiddleware,
  createLogisticsRouteDriverVehicleStatusMiddleware,
  createMaintenanceCompletedEquipmentRecordMiddleware,
  createMaintenanceCreatedEquipmentStatusMiddleware,
  createMaintenanceScheduleCompletedWorkOrderCreateMiddleware,
  createOpenShiftClaimedCreateScheduleShiftMiddleware,
  createPaymentPlanCompletedCollectionCaseResolveMiddleware,
  createPaymentProcessedInvoiceApplyMiddleware,
  createPaymentRefundedInvoiceRecordMiddleware,
  createPayrollRunPaidCascadeMiddleware,
  createPayrollRunPaidPeriodLockMiddleware,
  createPerformancePredictionRiskNotifyMiddleware,
  createPrepInventoryDemandMiddleware,
  createPrepListCancelledReleaseReservationMiddleware,
  createPrepListCompletedConsumeMiddleware,
  createPrepListSeedMiddleware,
  createPrepTaskStationCountMiddleware,
  createProposalClientActiveGuardMiddleware,
  createProposalLifecycleLeadStatusMiddleware,
  createProposalLineItemCountMiddleware,
  createQaCheckFailedCorrectiveActionMiddleware,
  createRbacMiddleware,
  createSampleDataSeedMiddleware,
  createSchedulePublishedNotifyStaffMiddleware,
  createScheduleShiftCountMiddleware,
  createScheduleShiftFirstShiftDueDateMiddleware,
  createShipmentItemReceivedInventoryRestockMiddleware,
  createStaffMemberCreatedTrainingAssignmentMiddleware,
  createStaffMemberDeactivatedUnassignEventStaffMiddleware,
  createTimecardEditApprovedTimeEntryApplyMiddleware,
  createTimeOffApprovedShiftCleanupMiddleware,
  createTrainingAttemptSubmittedRecordMiddleware,
  createVendorBlacklistedCancelPurchaseOrdersMiddleware,
} from "./middleware";
import {
  diffRegistryVsWiring,
  getAsyncRegistryEntries,
} from "./middleware/middleware-registry";
import { loadRolePolicies } from "./permission-guard";
import { ensureManifestSchema, getPool } from "./pg-pool";
import { PrismaIdempotencyStore } from "./prisma-idempotency-store";
import { PrismaJsonStore } from "./prisma-json-store";
import type { EntityInstance, PrismaStoreConfig } from "./prisma-store";
import { PrismaStore } from "./prisma-store";
import {
  createRequestStoreReadCache,
  wrapStoreWithRequestCache,
} from "./request-scoped-store-cache";
import {
  loadMergedPrecompiledIR,
  loadPrecompiledIR,
  verifyProvenanceHash,
} from "./runtime/loadManifests";
import type { CommandSettledInfo } from "./runtime-engine";
import { ManifestRuntimeEngine } from "./runtime-engine";
import {
  createSystemSideEffectDispatch,
  type SideEffectDispatchCommand,
} from "./system-side-effect-dispatch";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimal structural type for the full Prisma client.
 *
 * Includes only the delegates that the factory accesses directly:
 * - `user` for identity resolution (identity-middleware)
 * - `$transaction` for outbox writes when no override is provided
 *
 * Store constructors (PrismaStore, PrismaJsonStore, PrismaIdempotencyStore)
 * and loadRolePolicies() expect PrismaClient-specific types in their signatures.
 * The factory intentionally avoids importing `@repo/database`, so it cannot
 * reference `PrismaClient` directly.  Instead, `asStoreClient()` provides a
 * centralized structural cast for all PrismaClient-shaped parameters.
 */
export interface PrismaLike {
  // biome-ignore lint/suspicious/noExplicitAny: Prisma has overloaded $transaction signatures.
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
  user: {
    findFirst: (args: {
      where: { id: string; tenantId: string; deletedAt: null };
      select: { role: true };
    }) => Promise<{ role: string | null } | null>;
  };
}

/**
 * Structural type for the Prisma transaction client passed as prismaOverride.
 *
 * Transaction clients are produced by `prisma.$transaction(fn => ...)` and
 * expose the same model delegates as PrismaClient but without `$transaction`
 * (nesting is not allowed).  At runtime, the transaction client is a full
 * PrismaClient delegate, but we only declare the model-accessor pattern
 * needed for duck-typed store writes.
 *
 * Uses an index signature so callers can pass the raw Prisma transaction
 * client without explicit casting at the call site.
 */
export type PrismaTransactionClient = {
  [model: string]: unknown;
};

/**
 * Centralized structural cast from PrismaLike to the prisma type expected by
 * store constructors.
 *
 * Store constructors declare `prisma: PrismaClient` in their config types.
 * This factory intentionally avoids importing `@repo/database`, so it cannot
 * reference `PrismaClient` directly.  At runtime, PrismaLike is a structural
 * superset of what the stores need — they use duck-typed model-delegate access
 * (`prisma[entityName].findMany()` etc.) which works on both the full
 * PrismaClient and the transaction client produced by `$transaction`.
 *
 * This function is the single place where the structural mismatch is bridged.
 * The generic parameter `TPrisma` is inferred from each call site, keeping
 * the assertion narrow and auditable.
 */
function asStoreClient<TPrisma>(
  prisma: PrismaLike | PrismaTransactionClient
): TPrisma {
  return prisma as TPrisma;
}

/** Minimal structured logger the factory needs. */
export interface ManifestRuntimeLogger {
  error: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Telemetry hooks wired into the runtime engine context.
 *
 * Uses method syntax (not function-property syntax) so that callers can
 * inject implementations with narrower parameter types without tripping
 * `strictFunctionTypes` contravariance checks.
 */
export interface ManifestTelemetryHooks {
  onCommandExecuted?(
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ): void | Promise<void>;
  /**
   * Fires after EVERY command (success or failure). Used internally by the
   * factory to feed the reaction-execution log; not part of the caller-facing
   * telemetry surface (callers inject the sink via `deps.reactionLogSink`).
   */
  onCommandSettled?(info: CommandSettledInfo): void | Promise<void>;
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
}

/**
 * One append-only reaction-execution log row, built by the factory from a
 * settled command and handed to the app-injected `reactionLogSink`.
 *
 * This is an OPERATIONAL/observability record (constitution §11), NOT a
 * governed mutation — the sink writes it directly to the `reaction_logs`
 * table and fans it out over SSE for the dashboard.
 */
export interface ReactionLogRow {
  actorId: string | null;
  causationId: string | null;
  /** Triggering command name. */
  command: string;
  correlationId: string | null;
  durationMs: number;
  /** Semantic event names emitted by the command. */
  emittedEvents: string[];
  /** Triggering command's entity (null when the IR omits it). */
  entity: string | null;
  errorMessage: string | null;
  /** Command input keys (shape only — no values). */
  payloadKeys: string[];
  /** IR reactions ("Entity.command") triggered by the emitted events. */
  reactions: string[];
  source: string | null;
  status: "success" | "failed";
  tenantId: string;
}

/** Dependencies injected by the calling app. */
export interface CreateManifestRuntimeDeps {
  /** Error capture function (e.g. Sentry.captureException). Returns event id. */
  // The second parameter uses `never` so that Sentry's
  // `(err: unknown, hint?: ExclusiveEventHintOrCaptureContext) => string`
  // is assignable under strictFunctionTypes contravariance rules.
  // `never` is the bottom type — every concrete type satisfies it.
  captureException: (err: unknown, context?: never) => unknown;

  // -- Forwarded RuntimeOptions (Task 7.6) --
  // These are passthrough fields that the engine supports but the factory
  // does not otherwise provide defaults for. Callers may set them to
  // override engine behavior without modifying the factory itself.

  /** Throw on effect boundaries (useful in testing). */
  deterministicMode?: boolean;
  /**
   * Field-level encryption provider for `encrypted` property modifier.
   * When supplied, properties marked `encrypted` in .manifest source are
   * transparently encrypted at rest (AES-256-GCM envelope).
   * When absent (dev/test), encrypted properties store as plaintext.
   * Requires ENCRYPTION_KEY env var (64-char hex string).
   */
  encryptionProvider?: {
    encrypt(plaintext: string): Promise<{ ciphertext: string; keyId: string }>;
    decrypt(ciphertext: string, keyId: string): Promise<string>;
  };
  /** Limit expression evaluation depth/steps (guard against pathological expressions). */
  evaluationLimits?: {
    maxExpressionDepth?: number;
    maxEvaluationSteps?: number;
  };
  /**
   * Cross-instance event bus (Manifest Phase 6). When provided, the engine
   * publishes every committed command's event batch post-commit, fail-open
   * (RuntimeOptions.eventBus). The app injects a per-tenant RedisEventBus;
   * omit for dev/test — realtime falls back to the outbox-cron path.
   */
  eventBus?: RuntimeOptions["eventBus"];
  /** Feature-flag resolver for the `flag()` builtin. Without it, `flag()` returns false. */
  flagProvider?: (name: string) => unknown;
  /** Idempotency configuration (Phase 2: failureTtlMs plumbing). */
  idempotency?: { failureTtlMs?: number };
  /**
   * Precompiled IR to run, injected by the caller. When provided, the factory
   * uses it verbatim and skips {@link getManifestIR} — i.e. no filesystem read,
   * no repo-root walk, no JSON.parse on the cold-start path. `apps/api` passes a
   * static, bundler-inlined snapshot (`@/lib/manifest/frozen-ir`) so V8's module
   * cache parses the IR once. When omitted, the factory loads the merged
   * precompiled IR from `manifest/ir/` as before.
   */
  ir?: IR;
  /** Structured logger. */
  log: ManifestRuntimeLogger;
  /** Prisma client instance (the app's singleton). */
  prisma: PrismaLike;
  /**
   * Optional Prisma override for transaction-aware operations.
   * When provided (typically a transaction client from $transaction callback),
   * ALL internal Prisma operations use this client instead of `prisma`.
   * This enables atomic multi-entity writes in composite routes.
   */
  prismaOverride?: PrismaTransactionClient;
  /** Per-command profiling toggle + callback. */
  profiling?: {
    enabled?: boolean;
    onProfileComplete?: (profile: unknown) => void;
    detailed?: boolean;
  };
  /**
   * Optional sink for the append-only reaction-execution log. When provided,
   * the factory builds a {@link ReactionLogRow} for every settled command
   * (success or failure) and hands it to this sink. The app injects an
   * implementation that writes `reaction_logs` and fans out over SSE; the sink
   * MUST be non-throwing and should not block (fire-and-forget I/O), since it
   * runs inside the command execution path. Omit to disable reaction logging
   * (e.g. in apps/test contexts without a DB / realtime bus).
   */
  reactionLogSink?: (row: ReactionLogRow) => void;
  /** Require IR provenance hash verification on first engine creation. */
  requireValidProvenance?: boolean;
  /** Telemetry hooks for observability. */
  telemetry?: ManifestTelemetryHooks;
}

/** Context passed by the caller describing the acting user. */
export interface ManifestRuntimeContext {
  entityName?: string;
  user: {
    id: string;
    tenantId: string;
    role?: string;
  };
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
  // ── Custom stores with genuine business logic ──────────────────────────
  // These entities have cross-table queries, custom delete semantics, or
  // other logic that GenericPrismaStore cannot express.
  "PrepTask",
  "KitchenTask",
  "Station",
  "InventoryTransfer",

  // ── Recently reconciled entities (Driver/Vehicle governance migration) ──
  // Added to route through GenericPrismaStore → real Prisma tables instead
  // of PrismaJsonStore (JSON blob). Manifest source + Prisma schema aligned.
  "Driver",
  "Vehicle",
  "Event",
]);

/**
 * Entities that can be served by the metadata-driven GenericPrismaStore
 * (real typed Prisma tables) without a hand-written store class.
 *
 * Computed once at module load from the generated Prisma metadata. An entity
 * qualifies only when its model is tenant-scoped and uses the key shape
 * GenericPrismaStore assumes:
 *   - a `tenantId` column (the store always filters/injects tenantId), AND
 *   - a primary key of either `[id]` or `[tenantId, id]`
 *     (matches GenericPrismaStore.whereUnique()).
 *
 * Models without `tenantId` (e.g. Account, Tenant, settings, units, the
 * admin_* tables) or with other composite keys (EmployeeLocation, *Config
 * singletons) are deliberately EXCLUDED — routing them through the generic
 * store would emit `where: { tenantId }` against a column that doesn't exist
 * and throw at query time. Those remain on PrismaJsonStore until they get a
 * bespoke store or a non-tenant-scoped generic variant.
 *
 * This is intentionally derived, not a hand-maintained list, so it can never
 * drift from schema.prisma: regenerating the metadata
 * (`pnpm manifest:gen-prisma-meta`) updates the set automatically.
 */
/**
 * Entities force-kept on PrismaJsonStore despite passing the metadata shape check.
 * Empty after PrepList tenant-connect support (requiresTenantConnect in metadata).
 */
const EXCLUDED_FROM_GENERIC_STORE: ReadonlySet<string> = new Set([]);

function modelHasTenantScope(
  meta: (typeof PRISMA_MODEL_METADATA)[string]
): boolean {
  return meta.fields.some(
    (f) =>
      f.irName === "tenantId" || f.name === "tenantId" || f.name === "tenant_id"
  );
}

function pkShapeOk(pk: string[]): boolean {
  if (pk.length === 1 && pk[0] === "id") {
    return true;
  }
  if (pk.length === 2 && pk.includes("id")) {
    return pk.some((p) => p === "tenantId" || p === "tenant_id");
  }
  return false;
}

const GENERIC_STORE_SAFE_ENTITIES: ReadonlySet<string> = (() => {
  const safe = new Set<string>();
  for (const [name, meta] of Object.entries(PRISMA_MODEL_METADATA)) {
    if (EXCLUDED_FROM_GENERIC_STORE.has(name)) {
      continue;
    }
    if (modelHasTenantScope(meta) && pkShapeOk(meta.pkFields)) {
      safe.add(name);
    }
  }
  return safe;
})();

/**
 * True when an entity should be backed by a real typed Prisma table
 * (bespoke store via the switch, or the generic metadata-driven store)
 * rather than the JSON-blob fallback.
 *
 * A bespoke store (ENTITIES_WITH_SPECIFIC_STORES) always wins — even over the
 * known-broken exclusion list — because those entities have hand-written stores
 * that don't rely on GenericPrismaStore. Otherwise, an explicit exclusion forces
 * the JSON fallback regardless of metadata shape.
 */
function hasTypedStore(entityName: string): boolean {
  if (ENTITIES_WITH_SPECIFIC_STORES.has(entityName)) {
    return true;
  }
  if (EXCLUDED_FROM_GENERIC_STORE.has(entityName)) {
    return false;
  }
  // IR entity names (e.g. BankAccount) may differ from Prisma model keys
  // (e.g. EmployeeBankAccount). Resolve via ENTITY_TO_PRISMA_MODEL bridge.
  const modelKey = resolvePrismaModelKey(entityName);
  return (
    GENERIC_STORE_SAFE_ENTITIES.has(entityName) ||
    GENERIC_STORE_SAFE_ENTITIES.has(modelKey)
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a tenant-scoped store provider identical to the one the factory wires
 * into the engine. Exposed so external consumers (the async-reaction worker)
 * can load entities by id WITHOUT going through the engine's command path —
 * they need raw store reads for the load step of a reaction handler.
 *
 * Constitution §10: read-path freedom — handlers read via this provider and
 * dispatch governed writes via `engine.runCommand` (the same pattern as the
 * synchronous middleware).
 *
 * @internal — exported for the worker; not part of the stable factory API.
 */
export function buildStoreProvider(
  prisma: PrismaLike | PrismaTransactionClient,
  tenantId: string,
  userId: string,
  log: ManifestRuntimeLogger
): NonNullable<RuntimeOptions["storeProvider"]> {
  // Request-scoped read cache shared by every store this provider hands out.
  // buildStoreProvider is called once per runCommand (and once per async-drain),
  // so this Map lives exactly as long as one request's reaction cascade — the
  // window in which the trigger, parent-context resolver, and fired reactions all
  // re-load the same subjects. Without it each reload is a separate findUnique
  // (N+1 on the reaction chain). See request-scoped-store-cache.ts.
  const readCache = createRequestStoreReadCache();
  return (entityName: string) => {
    let store: Store<EntityInstance>;
    if (hasTypedStore(entityName)) {
      const config: PrismaStoreConfig = {
        prisma: asStoreClient<PrismaStoreConfig["prisma"]>(prisma),
        entityName,
        tenantId,
        userId,
      };
      store = new PrismaStore(config);
    } else {
      if (!loggedJsonStoreEntities.has(entityName)) {
        loggedJsonStoreEntities.add(entityName);
        log.info(
          `[manifest-runtime] Using PrismaJsonStore for entity: ${entityName}`
        );
      }
      store = new PrismaJsonStore({
        prisma:
          asStoreClient<
            ConstructorParameters<typeof PrismaJsonStore>[0]["prisma"]
          >(prisma),
        tenantId,
        entityType: entityName,
      });
    }
    return wrapStoreWithRequestCache(store, entityName, readCache);
  };
}

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

  // 2. Use the caller-injected IR when provided (apps/api passes a static,
  //    bundler-inlined snapshot — zero filesystem/repo-root/JSON.parse cost on
  //    cold start); otherwise load the merged precompiled IR from disk.
  const ir = deps.ir ?? getManifestIR();

  // 2a. Index IR reactions by their triggering event name so the
  //     reaction-execution log can record WHICH reactions a command's emitted
  //     events fired. Built once per runtime; cheap (the IR carries ~10).
  const reactionsByEvent = new Map<string, string[]>();
  if (deps.reactionLogSink) {
    const declaredReactions =
      (
        ir as unknown as {
          reactions?: Array<{
            event?: string;
            targetEntity?: string;
            targetCommand?: string;
          }>;
        }
      ).reactions ?? [];
    for (const reaction of declaredReactions) {
      if (!reaction?.event) {
        continue;
      }
      const target = `${reaction.targetEntity ?? "?"}.${reaction.targetCommand ?? "?"}`;
      const existing = reactionsByEvent.get(reaction.event);
      if (existing) {
        existing.push(target);
      } else {
        reactionsByEvent.set(reaction.event, [target]);
      }
    }
  }

  // 2b. Verify IR provenance integrity (once per process lifetime).
  //    Compares a deterministic SHA-256 of the IR against the stored irHash.
  //    This detects file tampering or corruption without modifying the IR.
  //    Verification is opt-in via deps.requireValidProvenance; when enabled,
  //    a mismatch throws before any command can execute.
  const provenanceResult = verifyProvenanceHash(ir);
  if (!provenanceResult.valid) {
    if (deps.requireValidProvenance) {
      throw new Error(
        `[manifest-runtime] IR provenance verification failed: ${provenanceResult.error}`
      );
    }
    // Log warning but don't block — allows gradual rollout.
    deps.log.info(
      `[manifest-runtime] IR provenance warning: ${provenanceResult.error}`
    );
  }

  // 3. Build the store provider — entities with dedicated Prisma models use
  //    PrismaStore; everything else falls back to PrismaJsonStore.
  const storeProvider: RuntimeOptions["storeProvider"] = buildStoreProvider(
    prismaForWrites,
    user.tenantId,
    user.id,
    deps.log
  );

  // 5. Build telemetry hooks — pass through caller-provided telemetry only.
  //    Outbox event persistence is now handled by the audit middleware (step 8),
  //    which runs inside the engine lifecycle at the after-emit hook instead of
  //    via post-hoc telemetry hooks. This separates observability (telemetry)
  //    from durability (outbox writes).
  const reactionLogSink = deps.reactionLogSink;
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
    // Reaction-execution log: build one append-only row per settled command
    // (success OR failure) and hand it to the injected sink. Wrapped so a
    // malformed result or sink error can never break the command path.
    onCommandSettled: reactionLogSink
      ? (info: CommandSettledInfo) => {
          try {
            const emittedEvents = (info.result.emittedEvents ?? []).map(
              (event) => event.name
            );
            const reactions: string[] = [];
            for (const eventName of emittedEvents) {
              const targets = reactionsByEvent.get(eventName);
              if (targets) {
                reactions.push(...targets);
              }
            }

            const failed = !info.result.success;
            let errorMessage: string | null = null;
            if (failed) {
              const r = info.result as unknown as {
                error?: unknown;
                message?: unknown;
                guardFailure?: { formatted?: string };
              };
              errorMessage =
                r.guardFailure?.formatted ??
                (r.error == null ? null : String(r.error)) ??
                (r.message == null ? null : String(r.message)) ??
                "command failed";
            }

            const irEntity = (
              info.irCommand as unknown as { entity?: string } | undefined
            )?.entity;

            reactionLogSink({
              tenantId: user.tenantId,
              actorId: user.id ?? null,
              entity: info.entityName ?? irEntity ?? null,
              command: info.commandName,
              status: failed ? "failed" : "success",
              emittedEvents,
              reactions,
              errorMessage,
              payloadKeys: Object.keys(info.input ?? {}),
              durationMs: info.durationMs,
              correlationId: info.correlationId ?? null,
              causationId: info.causationId ?? null,
              source: null,
            });
          } catch {
            // Best-effort observability — never throw from the settle hook.
          }
        }
      : undefined,
  };

  // 6. Idempotency store for command deduplication.
  //    IMPORTANT: The runtime engine REJECTS commands when an idempotency store
  //    is configured but no idempotencyKey is provided. Since generated routes
  //    do NOT pass idempotencyKey, we must NOT create the store by default.
  //    Only create it when the caller explicitly opts in via deps.idempotency.
  //
  //    Phase 2: When generated routes are updated to pass idempotencyKey,
  //    re-enable the default store creation.
  const idempotencyStore = deps.idempotency
    ? new PrismaIdempotencyStore({
        prisma:
          asStoreClient<
            ConstructorParameters<typeof PrismaIdempotencyStore>[0]["prisma"]
          >(prismaForWrites),
        tenantId: user.tenantId,
      })
    : undefined;

  // 7. Load role policies for RBAC middleware.
  //    Always load policies for the tenant — the identity middleware resolves
  //    the user's role inside the engine lifecycle (before-policy hook), so
  //    the role may not be known at factory construction time. The RBAC
  //    middleware (before-guard) uses these policies against the resolved role.
  const rolePolicies = await loadRolePolicies(
    asStoreClient<Parameters<typeof loadRolePolicies>[0]>(prismaForLookups),
    user.tenantId
  );

  // 8a. Bootstrap upstream Manifest Postgres adapters (BEFORE the middleware
  //     pipeline because the pilot async-reaction middleware needs the
  //     `asyncDispatch` bridge wired into their options at construction time).
  //     PostgresAuditSink provides durable audit records for every governed
  //     command (constitution §12). Engine outbox writes go to the LEGACY
  //     tenant."OutboxEvent" table via createOutboxAdapter so the existing
  //     every-minute /outbox/publish cron drains them into SSE (the native
  //     manifest_outbox_entries table had no drain — events piled up
  //     undelivered). The audit sink shares the singleton pg.Pool from
  //     pg-pool.ts.
  //     Schema bootstrap (CREATE TABLE IF NOT EXISTS) is idempotent.
  //     GRACEFUL: adapters are skipped when DATABASE_URL is absent (test envs,
  //     CI without DB). The engine still works — just without persistent audit
  //     or outbox delivery.
  //
  //     Async reaction queue — Capsule-owned durable queue for slow cross-
  //     entity reactions (battle board sync, inventory restock, …) deferred
  //     out of the synchronous runCommand path. Lives on the SAME pg.Pool (per
  //     AGENTS.md HARD RULE #2 — prefer official methods; no new Redis/Inngest
  //     infra). Two pilot reactions are registered + opted-in below; the
  //     remaining ~18 migrations are 1-line factory edits each (no middleware
  //     code change, see async-dispatch.ts). Skipped without DB → middleware
  //     falls back to synchronous dispatch.
  const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  let auditSink: PostgresAuditSink | undefined;
  let outboxStore: OutboxStore | undefined;
  let approvalStore: PostgresApprovalStore | undefined;
  let asyncReactionStore: PostgresAsyncReactionStore | undefined;
  let asyncDispatch: AsyncDispatch | undefined;
  if (dbUrl) {
    await ensureManifestSchema();
    const pool = getPool();
    auditSink = new PostgresAuditSink({ pool });
    outboxStore = createOutboxAdapter({
      db: asStoreClient<PrismaClientLike>(prismaForWrites),
      tenantId: user.tenantId,
    });
    approvalStore = new PostgresApprovalStore({ pool });
    asyncReactionStore = new PostgresAsyncReactionStore({
      pool,
      log: deps.log,
    });
    _asyncReactionStore = asyncReactionStore;
    asyncDispatch = createAsyncDispatch(asyncReactionStore);
    // Register pilot handlers (idempotent across multiple factory calls in
    // the same process — `asyncReactionHandlersRegistered` guard).
    registerAsyncReactionHandlers();
  }

  // 8. Build middleware pipeline.
  //    Middleware runs INSIDE the Manifest engine lifecycle, replacing both
  //    the external Proxy wrapper (RBAC) and pre-engine role resolution.
  //    Pipeline order:
  //    - before-policy: Identity enrichment (resolve user role from DB)
  //    - before-guard:  RBAC permission check (command-level authorization)
  //    Note: after-emit audit/outbox persistence is now handled by the engine
  //    natively via auditSink + outboxStore RuntimeOptions (step 9).
  let engine: ManifestRuntimeEngine;
  const dispatchNotificationAsSystem: SideEffectDispatchCommand = (
    commandName,
    input,
    options
  ) => createSystemSideEffectDispatch(engine)(commandName, input, options);
  /**
   * Ordered registry names mirroring the `middleware` array below — one entry
   * per pipeline position, in declaration order. The source of truth for the
   * wiring-completeness check (see {@link validateWiringCompleteness}), which
   * catches middleware wired without a registry declaration (invisible to the
   * audit graph) or declared but never wired (dead propagation).
   *
   * Keep this list in lock-step with the `middleware` array — the test suite
   * asserts length parity so a position added to one without the other fails.
   */
  const MIDDLEWARE_PIPELINE_NAMES = [
    "identity",
    "rbac",
    "event-staff-active-guard",
    "sample-data-seed",
    "prep-list-seed",
    "prep-inventory-demand",
    "prep-list-completed-consume",
    "prep-list-cancelled-release-reservation",
    "prep-task-station-count",
    "event-guest-count-prep-rescale",
    "event-dish-prep-sync",
    "dish-deactivated-prune",
    "chart-of-account-deactivated-deactivate-children",
    "container-deactivated-dish-clear",
    "ingredient-recalled-quarantine-inventory",
    "qa-check-failed-corrective-action",
    "lead-converted-deal-create",
    "proposal-lifecycle-lead-status",
    "deal-lifecycle-propagation",
    "client-interaction-overdue-notify",
    "client-interaction-escalated-notify",
    "contract-signed-event-confirm",
    "payment-processed-invoice-apply",
    "payment-refunded-invoice-record",
    "collection-payment-recorded-invoice-apply",
    "collection-written-off-invoice-write-off",
    "payment-plan-completed-collection-case-resolve",
    "invoice-overdue-collection-case-create",
    "invoice-fully-paid-mark-paid",
    "invoice-written-off-revrec-cancel",
    "labor-budget-actual-recorded-alert",
    "inventory-movement-transaction",
    "inventory-stock-sync-item",
    "inventory-transfer-received-stock-movement",
    "shipment-item-received-inventory-restock",
    "maintenance-completed-equipment-record",
    "maintenance-created-equipment-status",
    "maintenance-schedule-completed-work-order-create",
    "facility-work-order-asset-status",
    "logistics-dispatch-driver-vehicle-status",
    "logistics-route-driver-vehicle-status",
    "training-attempt-submitted-record",
    "staff-member-created-training-assignment",
    "employee-certification-lapsed-notify",
    "employee-certification-lapsed-suspend-availability",
    "schedule-shift-first-shift-due-date",
    "schedule-published-notify-staff",
    "time-off-approved-shift-cleanup",
    "staff-member-deactivated-unassign-event-staff",
    "open-shift-claimed-create-schedule-shift",
    "schedule-shift-count",
    "proposal-line-item-count",
    "event-created-client-interaction",
    "event-finalized-client-interaction",
    "event-finalized-followup",
    "event-finalized-release-reservation",
    "event-updated-board-sync",
    "event-location-catering-sync",
    "event-staff-assigned-notify",
    "event-cancelled-cascade",
    "vendor-blacklisted-cancel-purchase-orders",
    "email-template-deleted-deactivate-workflows",
    "email-template-deleted-sms-rule-deactivate",
    "timecard-edit-approved-time-entry-apply",
    "payroll-run-paid-period-lock",
    "payroll-run-paid-cascade",
  ] as const;
  const middleware: Middleware[] = [
    createIdentityMiddleware({
      prisma: prismaForLookups,
      captureException: deps.captureException,
    }),
    createRbacMiddleware({ rolePolicies }),
    // Cross-entity precondition (before-guard): block EventStaff.assign when the
    // referenced StaffMember is deactivated/soft-deleted. A Manifest guard cannot
    // express this — guards see only self/user/context/params, never another
    // entity's live state — so it loads StaffMember from the store and
    // short-circuits. Fail-open on missing store / not-found (only a positive
    // "inactive" signal blocks). See event-staff-active-guard-middleware.ts.
    createEventStaffActiveGuardMiddleware({ storeProvider }),
    // Cross-entity precondition (before-guard): block Proposal.send when the
    // linked Client is archived (soft-deleted). Same rationale as the EventStaff
    // guard above — a Manifest guard cannot read another entity's state, and
    // `clientId` is the Proposal's own field (not a `send` param), so it is a
    // two-hop load (Proposal -> Client). Fail-open; only a positive "archived"
    // signal blocks. See proposal-client-active-guard-middleware.ts.
    createProposalClientActiveGuardMiddleware({ storeProvider }),
    // Cross-entity precondition (before-guard): block EventContract.sign when the
    // linked Event is no longer active (completed/archived/cancelled). Same
    // rationale as the EventStaff/Proposal guards — a Manifest guard cannot read
    // another entity's state, and `eventId` is the EventContract's own field
    // (sign() takes no params), so it is a two-hop load (EventContract -> Event).
    // Fail-open; only a positive inactive-status signal blocks. See
    // event-contract-event-active-guard-middleware.ts.
    createEventContractEventActiveGuardMiddleware({ storeProvider }),
    // Onboarding: SampleData.seed/reseed/clear -> actually populate/remove the
    // demo Event/Client/Recipe/PrepTask/Inventory rows via the existing
    // seedSampleData/clearSampleData helpers. The governed command only flips the
    // SampleData tracking row + emits its event; this after-emit effect is the
    // "store's effect handler" the source promised but never had — without it the
    // onboarding "Load sample data" CTA marked tenants seeded without creating
    // anything. Direct Prisma writes are §9-permissible inside the runtime
    // effect boundary. Uses the main client (not the tx override) for the bulk
    // multi-table seed; non-fatal on failure (sample data is expendable).
    createSampleDataSeedMiddleware({
      prisma:
        asStoreClient<
          Parameters<typeof createSampleDataSeedMiddleware>[0]["prisma"]
        >(prismaForLookups),
    }),
    // after-emit pair completing the declarative event chain:
    // EventConfirmed -> PrepList.create (reaction) -> seed items (below),
    // PrepListFinalized -> consolidated draft requisition (below).
    createPrepListSeedMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    createPrepInventoryDemandMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Kitchen: PrepListCompleted -> InventoryItem.consume (per PrepListItem).
    // Closes the reservation leak left by prep-inventory-demand: that middleware
    // RESERVES on PrepListFinalized (bumps quantityReserved) but nothing consumed
    // those reservations, so finalized lists stranded reserved stock forever.
    // markCompleted now draws the reservation down: `consume` decrements BOTH
    // quantityOnHand and quantityReserved in one command, so a single dispatch
    // both records real usage and releases the reservation. Middleware (not a
    // reaction) because it is a 1:N fan-out over PrepListItem rows that a
    // reaction cannot resolve.
    createPrepListCompletedConsumeMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Kitchen: PrepListCancelled -> InventoryItem.releaseReservation (per item).
    // Symmetric counterpart of the consume leg above: prep-inventory-demand
    // RESERVES on finalize, consume releases on complete, and THIS releases on
    // cancel — closing the reservation leak a cancelled (but finalized) prep
    // list would otherwise strand forever. Also the inventory leg of the
    // EventCancelled cascade: the cascade's PrepList.cancel re-enters runCommand,
    // emits PrepListCancelled, and this middleware releases the held stock.
    createPrepListCancelledReleaseReservationMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Kitchen: PrepTask claim/complete/cancel/unclaim/release/reassign ->
    // reconcile Station.currentTaskCount. Middleware (not a reaction) because it
    // fans out across all of a tenant's stations and derives occupancy from a
    // cross-entity PrepTask scan. RECOMPUTE, not +1/-1 deltas: unclaim/release
    // CLEAR stationId in the same mutate, so by after-emit a delta middleware has
    // lost the station to decrement — the count would leak upward forever. Nothing
    // moved the stored count before (assignTask/removeTask had no caller), so the
    // Station capacity computeds + assignTask blockFull/warnNearCapacity were
    // inert. This dispatches the absolute, idempotent Station.syncTaskCount only
    // for stations whose stored count drifted from their true in_progress load.
    createPrepTaskStationCountMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Events→Kitchen: EventGuestCountUpdated -> rescale draft PrepLists +
    // PrepListItems. Middleware (not a reaction) for TWO reasons: it is a 1:N
    // fan-out (one Event → many prep lists → many items), and the rescale is a
    // RATIO (new/old guest count) whose OLD value is destroyed by the command's
    // `mutate guestCount = newGuestCount` and never carried on the payload. It
    // captures the old count on the `before-guard` hook (evalContext.self still
    // pre-mutation) and applies the ratio on `after-emit`. batchMultiplier was
    // frozen at the seed's hardcoded 1 and item scaledQuantity was derived once,
    // so guest-count changes silently left the kitchen prepping the wrong amount.
    createEventGuestCountPrepRescaleMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Events→Kitchen: EventDishCreated / EventDishQuantityUpdated -> sync the
    // event's draft PrepLists. Middleware (not a reaction) because it is a 1:N
    // fan-out, the ingredient demand is DERIVED across a cross-store walk the DSL
    // cannot express, and updateQuantity carries no eventId (the dish's own
    // field). A dish added or re-portioned AFTER the seed had no consumer, so it
    // never reached the kitchen. RE-DERIVES the full demand from the current
    // dishes and reconciles create/updateQuantity per draft list (target scale =
    // derivedScaled × batchMultiplier, preserving the guest-count rescale).
    // Removal is deferred (no PrepListItem.remove command exists yet).
    createEventDishPrepSyncMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Kitchen→Kitchen/Menu: DishDeactivated -> retire the discontinued dish from
    // open PrepTasks (cancel), draft PrepListItems (remove), and event menus
    // (EventDish.remove). Middleware (not a reaction) because it is a 1:N fan-out
    // across three entities keyed by the dish's OWN id (_subject.id) — a reaction
    // resolves exactly one target. Scoped to deactivate (permanent discontinue),
    // NOT the transient/reversible eightySix: an 86 has Dish.reinstate and no
    // restore-on-reinstate provenance, so blanket irreversible pruning would strip
    // the dish from future events for a same-day stockout (deferred — see plan).
    createDishDeactivatedPruneMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Accounting: ChartOfAccountDeactivated -> deactivate the account's child
    // accounts. Deactivating a parent GL account left every sub-account pointing
    // at it (parentId) ACTIVE, so retired sub-accounts stayed postable under a
    // dead parent. Middleware (not a reaction) because it is a 1:N fan-out keyed
    // by the parent's OWN id (event.subject?.id, not auto-populated onto the
    // event; deactivate takes no params) — a reaction resolves one target.
    // Re-entrant: a deactivated child re-emits the event and deactivates its own
    // children, so the WHOLE subtree retires (termination guaranteed by
    // deactivate's isActive guard). Safe to cascade — deactivate is effectively
    // terminal (no activate; update is guarded against inactive accounts), so the
    // permanent-cascade rule applies (mirrors VendorBlacklisted, not the
    // reversible suspend/setActive legs). Guard-safe + idempotent (only active,
    // non-deleted children dispatched).
    createChartOfAccountDeactivatedDeactivateChildrenMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Kitchen: ContainerDeactivated -> clear the default-container reference on
    // every Dish that points at the retired container. Deactivating a container
    // left dishes' defaultContainerId pointing at it, so the belongsTo
    // defaultContainer relationship resolved a dead reference. Middleware (not a
    // reaction) because it is a 1:N fan-out keyed by the container's OWN id
    // (_subject.id, not auto-populated onto the event) — a reaction resolves one
    // target. Safe to cascade (clearing an FK is a non-destructive, reversible
    // cleanup); guard-safe + idempotent (clearDefaultContainer guards
    // defaultContainerId != "", soft-deleted dishes skipped).
    createContainerDeactivatedDishClearMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Kitchen/inventory: IngredientRecallFlagged -> pull the linked InventoryItem.
    // When a supplier recall flags an ingredient (flagRecall), the ingredient row
    // is deactivated but its physical inventory stock stayed live/visible. This
    // loads the recalled Ingredient (the inventoryItemId FK is its OWN field, not a
    // flagRecall param, and is never auto-populated onto the event -> middleware,
    // not a reaction) and dispatches the governed InventoryItem.softDelete to pull
    // the stock from inventory. Guard-safe (skips already-deleted / unlinked items).
    createIngredientRecalledQuarantineInventoryMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Kitchen QA: QACheckFailed -> open a QACorrectiveAction. A failed quality
    // check (the fail command's own comment says "callers should open a
    // QACorrectiveAction") had ZERO consumers, so failures recorded no
    // remediation. Middleware (not a reaction) because the corrective action's
    // relatedCheckId is the QACheck id (_subject.id) and the dispatch tenantId is
    // the check's OWN field — neither is a `fail` param and neither is
    // auto-populated onto the event -> the leg LOADS the check via _subject.id.
    // Guard-safe (skips when tenant/store unresolvable) + per-check idempotency.
    createQaCheckFailedCorrectiveActionMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // CRM: LeadConvertedToClient -> Deal.create. Middleware (not a reaction)
    // because the deal's title/value are the Lead's OWN fields, which
    // convertToClient does not take as params — the middleware loads the
    // converted Lead from the store and dispatches the governed Deal.create.
    createLeadConvertedDealCreateMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // CRM: ProposalCreated/Sent -> Lead.status="proposal", ProposalAccepted ->
    // "won", ProposalRejected -> "lost". Middleware (not a reaction) because the
    // Lead is identified by Proposal.leadId — the proposal's OWN field, which
    // send/accept/reject do not take as params — and `Lead.update` is a full-field
    // mutate guarded by `contactName != ""`, so the lead must be LOADED and its
    // existing fields re-passed. FSM-aware: only advances when the transition is
    // legal from the lead's current status (skips already-advanced/converted leads).
    createProposalLifecycleLeadStatusMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // CRM: DealClosed -> Lead.status mirror (won/lost) + DealAssigned ->
    // Notification.create. Middleware (not a reaction) because the Lead is
    // identified by Deal.leadId — the deal's OWN field, NOT a `close` param (only
    // `status` rides the payload) — and `Lead.update` is a full-field mutate guarded
    // by `contactName != ""`, so the lead must be LOADED and re-passed. FSM-aware:
    // mirrors only when the transition is legal from the lead's current status. The
    // assignee notification likewise needs the deal's `title` (its OWN field), so the
    // deal is loaded before dispatching the governed Notification.create.
    createDealLifecyclePropagationMiddleware({
      storeProvider,
      dispatchCommand: dispatchNotificationAsSystem,
    }),
    // CRM: ClientInteractionMarkedOverdue -> Notification.create for the assignee.
    // Middleware (not a reaction) because `markOverdue()` takes NO params, so the
    // emitted payload carries no entity fields (declared event fields are never
    // auto-populated from self.*) — the recipient (employeeId), subject, and tenantId
    // are the interaction's OWN fields and must be LOADED from the store. The event
    // was an orphan (no consumer), so overdue follow-ups generated zero signal.
    createClientInteractionOverdueNotifyMiddleware({
      storeProvider,
      dispatchCommand: dispatchNotificationAsSystem,
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // CRM: ClientInteractionEscalated -> Notification.create for the escalation
    // TARGET (escalatedTo), the sibling of the overdue leg. Middleware because the
    // notification needs the interaction's OWN subject/tenantId (never auto-populated
    // onto the event payload) — loaded from the store. The event was an orphan, so
    // escalations produced zero in-app signal for the person they were handed to.
    createClientInteractionEscalatedNotifyMiddleware({
      storeProvider,
      dispatchCommand: dispatchNotificationAsSystem,
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Events: ContractSigned -> Event.confirm. Middleware (not a reaction)
    // because the event to confirm is identified by EventContract.eventId — the
    // contract's OWN field — and `sign()` takes no params, so a reaction's
    // payload cannot carry it. The middleware loads the signed contract from the
    // store, reads self.eventId, and dispatches the governed Event.confirm.
    createContractSignedEventConfirmMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Finance: PaymentProcessed -> Invoice.applyPayment. Middleware (not a reaction)
    // because the invoice to credit (Payment.invoiceId) and the amount
    // (Payment.amount) are the Payment's OWN fields, which `process` does not take
    // as params — the middleware loads the processed Payment from the store and
    // dispatches the governed Invoice.applyPayment (guard-safe; skips DRAFT/overpay
    // so the route's ACCEPTED_NOT_APPLIED fallback handles them). Replaces the
    // dormant ProcessInvoicePayment saga (removed) to avoid double-apply.
    createPaymentProcessedInvoiceApplyMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Finance: PaymentRefunded -> Invoice.recordRefund. Middleware (not a reaction)
    // for the same reason as the apply leg: the invoice to credit back
    // (Payment.invoiceId) is the Payment's OWN field, which refund/partialRefund do
    // not take as params. The refund AMOUNT is a command input param (so it rides the
    // payload), but the middleware still loads the refunded Payment for invoiceId and
    // dispatches the governed Invoice.recordRefund (guard-safe; skips when the invoice
    // was never credited or the refund exceeds amountPaid).
    createPaymentRefundedInvoiceRecordMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Finance: CollectionPaymentRecorded -> Invoice.applyPayment. Middleware (not a
    // reaction) for the same reason as the payment legs: the invoice to credit is
    // CollectionCase.invoiceId — the case's OWN field, NOT a recordPayment param —
    // and declared event fields are never auto-populated from self.*. The old
    // reaction resolved payload.result.invoiceId (a mutate scalar) so it silently
    // no-op'd and collections never credited the AR books. The middleware loads the
    // CollectionCase from the store via _subject.id, reads self.invoiceId, takes the
    // amount/paymentId from the command input, and dispatches the governed
    // Invoice.applyPayment (guard-safe; skips DRAFT/PAID/overpay).
    createCollectionPaymentRecordedInvoiceApplyMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Finance: CollectionWrittenOff -> Invoice.writeOff (closes the other end of the
    // collections<->invoice loop). Middleware (not a reaction) because the invoice to
    // write off is the CollectionCase's OWN invoiceId field, not a writeOff param, and
    // declared event fields are never auto-populated from self.*. Loads the case via
    // _subject.id, reads self.invoiceId, and writes off the invoice's full remaining
    // amountDue via the governed Invoice.writeOff (guard-safe: skips non-OVERDUE/
    // PARTIALLY_PAID and zero-due invoices; idempotent per case). NOTE: the source
    // CollectionCase.writeOff command was DEAD until the FSM gained a "WRITTEN_OFF"
    // transition target (collections-rules.manifest) — same fix this change makes.
    createCollectionWrittenOffInvoiceWriteOffMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Finance: PaymentPlanCompleted -> CollectionCase.markResolved (closes the
    // collections payment-plan loop). Middleware (not a reaction) because the case to
    // resolve is the CollectionPaymentPlan's OWN collectionCaseId field, not a
    // markCompleted param (markCompleted takes none) — and declared event fields are
    // never auto-populated from self.*. PaymentPlanCompleted had ZERO consumers, so a
    // fully-paid plan left its case ACTIVE in dunning forever. Loads the plan via
    // _subject.id, reads self.collectionCaseId, and dispatches the governed
    // CollectionCase.markResolved (guard-safe: skips terminal cases and cases that still
    // owe a balance — markResolved guards outstandingAmount <= 0.01; idempotent per case).
    createPaymentPlanCompletedCollectionCaseResolveMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Finance: InvoiceMarkedOverdue -> CollectionCase.create. Middleware (not a
    // reaction) because every field a collection case needs (clientId/eventId/total/
    // amountDue/invoiceNumber) is the Invoice's OWN field, not a markOverdue param
    // (markOverdue takes none) — and declared event fields are never auto-populated
    // from self.*. InvoiceMarkedOverdue had ZERO consumers, so overdue invoices never
    // opened an AR-recovery case unless someone did it by hand. The middleware loads
    // the Invoice via _subject.id and dispatches the governed CollectionCase.create
    // (idempotent: skips when a case already exists for the invoice — mirrors the
    // route's 409 guard; skips zero-total invoices that would fail amount_positive).
    createInvoiceOverdueCollectionCaseCreateMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Finance: a full payment via Invoice.applyPayment leaves status PARTIALLY_PAID with
    // amountDue 0 (applyPayment unconditionally sets PARTIALLY_PAID) — the invoice never
    // closes to PAID, so AR/collections keep chasing settled debt. Middleware (not a
    // reaction) because "is the balance now zero" depends on the Invoice's OWN
    // post-mutation amountDue/status, which a reaction's {...commandInput, result} payload
    // cannot read. Scoped to applyPayment so markAsPaid's own PaymentApplied does not
    // re-trigger it; loads the invoice via _subject.id and dispatches markAsPaid when
    // amountDue <= 0 and status != PAID.
    createInvoiceFullyPaidMarkPaidMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Finance: InvoiceWrittenOff -> RevenueRecognitionSchedule.cancel. When an invoice
    // is written off as uncollectable, any schedule still recognizing revenue against it
    // must stop — otherwise the books accrue earned revenue on dead debt and PENDING/
    // IN_PROGRESS schedules dangle forever. Middleware (not a reaction) because the
    // schedule(s) to cancel are found by RevenueRecognitionSchedule.invoiceId — the
    // SCHEDULE's OWN field on the related child entity, not a writeOff param — and it is a
    // 1:N fan-out a reaction cannot do. Loads cancellable schedules (PENDING/IN_PROGRESS/
    // PAUSED) by invoiceId and dispatches the governed cancel(reason), forwarding the
    // writeOff reason (a genuine param). InvoiceWrittenOff had ZERO consumers.
    createInvoiceWrittenOffRevRecCancelMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Labor: LaborBudgetActualRecorded -> BudgetAlert.create (over target). Middleware
    // (not a reaction) because "is this now over budget?" compares the post-mutation
    // actualSpend against the budget's OWN budgetTarget — recordActual's
    // {...commandInput, result} payload carries only actualSpend, not the target, so a
    // reaction cannot decide. LaborBudgetActualRecorded had ZERO consumers, so an
    // over-budget labor period stayed silent. Loads the LaborBudget via _subject.id,
    // and when actualSpend > budgetTarget dispatches the governed BudgetAlert.create
    // (idempotent: at most one unresolved overage alert per budget; under-budget is a
    // quiet no-op).
    createLaborBudgetActualRecordedAlertMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Inventory: InventoryConsumed/Wasted/Restocked/Adjusted -> InventoryTransaction.create.
    // Middleware (not a reaction) because the ledger row's unitCost is the
    // InventoryItem's OWN field (loaded from the store; restock alone carries
    // costPerUnit as a param) and the SIGNED ledger delta (consume/waste = −qty,
    // restock/adjust = +qty) cannot be expressed in a reaction's payload params.
    // Records every governed inventory movement in the append-only ledger that
    // valuation/par-reorder/audit read — previously empty for kitchen movements.
    createInventoryMovementTransactionMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Inventory: InventoryStock.adjust/recount -> InventoryItem.adjust. Keeps the
    // aggregate item total in sync with per-storage-location stock movements;
    // without it the per-location stock and item total diverge permanently after
    // any location adjustment/recount. Middleware (not a reaction) because the
    // target item is InventoryStock.itemId (the stock row's OWN field, NOT an
    // adjust/recount param — declared event fields are never auto-populated from
    // self.*), and recount's delta = newQuantity - PRE-mutation on-hand, which is
    // gone by after-emit (captured on before-guard, same two-hook pattern as the
    // guest-count rescale). The propagated InventoryItem.adjust emits
    // InventoryAdjusted, which the inventory-movement middleware above ledgers.
    createInventoryStockSyncItemMiddleware({
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Inventory: TransferReceived -> per-location InventoryStock movement. When an
    // inventory transfer is RECEIVED, move each line item's quantity out of the
    // source-location stock row (adjust -qty) and into the destination row
    // (adjust +qty); bootstrap the destination row at 0 first when it doesn't
    // exist. Middleware (not a reaction) because it is a 1:N fan-out over
    // InventoryTransferItem rows across two locations, and from/toLocationId are
    // the transfer's OWN fields (not `receive` params). The aggregate InventoryItem
    // total is left UNCHANGED automatically: each InventoryStock.adjust is mirrored
    // by the stock-sync middleware above, so source(-qty)+dest(+qty) cancel — a
    // transfer redistributes on-hand across locations, it doesn't change the total.
    createInventoryTransferReceivedStockMovementMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Procurement: ShipmentItemReceived -> InventoryItem.restock. Middleware (not a
    // reaction) because the values restock needs are the ShipmentItem's OWN fields,
    // not updateReceived params: itemId (which item) is ShipmentItem.itemId, and
    // costPerUnit must be ShipmentItem.unitCost — declared event fields are never
    // auto-populated from self.*. The old reaction resolved payload.result.itemId (a
    // mutate scalar) and hardcoded costPerUnit: 0, so it silently no-op'd and would
    // have zeroed InventoryItem.unitCost on every receipt. The nested restock emits
    // InventoryRestocked, which the inventory-movement middleware above ledgers.
    //
    // ASYNC PILOT: when the Postgres async-reaction queue is wired (production
    // with DB), this middleware ENQUEUES jobs and returns immediately — the
    // worker drains them via the registered `shipmentItemReceivedInventoryRestock`
    // handler. Receiving a multi-line shipment no longer serially blocks on each
    // restock. Per-received-line idempotency is preserved (the worker is
    // at-least-once). Falls back to synchronous dispatch in test/dev without DB.
    createShipmentItemReceivedInventoryRestockMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Equipment: MaintenanceWorkOrderCompleted -> Equipment.recordMaintenance.
    // Middleware (not a reaction) because the equipment to record against
    // (MaintenanceWorkOrder.equipmentId) is the work order's OWN field, NOT a
    // completeWork param — declared event fields are never auto-populated from
    // self.*. The two old reactions resolved payload.result.equipmentId (a mutate
    // scalar) so they silently no-op'd; completed work orders never touched the
    // equipment record. The middleware loads the completed work order from the
    // store via _subject.id, reads self.equipmentId, and dispatches the governed
    // Equipment.recordMaintenance (which itself sets status = "active", subsuming
    // the redundant updateStatus reaction whose newStatus != self.status guard
    // would fail once active).
    createMaintenanceCompletedEquipmentRecordMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Equipment: MaintenanceWorkOrderCreated -> Equipment.updateStatus("maintenance").
    // Symmetric counterpart of the completed leg above: opening a work order takes the
    // parent equipment OUT of service (status -> "maintenance") so it stops reading as
    // bookable; completing the work order (recordMaintenance, above) returns it to active.
    // Middleware (not a reaction) for guard-safety — it loads the equipment and skips
    // cleanly when it is already in maintenance / retired / out_of_service instead of
    // firing updateStatus and relying on the engine swallowing the FSM-guard failure
    // (equipmentId IS a create param, so a reaction was technically possible here; we
    // choose middleware deliberately). Pure runtime addition, no IR/source change.
    createMaintenanceCreatedEquipmentStatusMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Preventive maintenance: MaintenanceScheduleCompleted -> MaintenanceWorkOrder.create.
    // Closes the recurrence loop: completing a PreventiveMaintenanceSchedule rolls its
    // nextDueAt forward but had ZERO consumers, so the NEXT work order was never opened
    // and preventive maintenance silently stopped. Middleware (not a reaction) because
    // the work order's fields (equipmentId/areaId/title/...) are the schedule's OWN
    // fields, NOT `complete` params, and declared event fields are never auto-populated
    // from self.*; it loads the schedule via _subject.id and dispatches the governed,
    // explicit MaintenanceWorkOrder.create scheduled for the schedule's new nextDueAt
    // (deduped per asset + due date so a re-emit cannot double-open the cycle).
    createMaintenanceScheduleCompletedWorkOrderCreateMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Facilities: FacilityWorkOrder lifecycle -> FacilityAsset maintenance status.
    // The facility-side mirror of the two Equipment legs above:
    //   FacilityWorkOrderCreated   -> FacilityAsset.sendToMaintenance   (operational -> maintenance)
    //   FacilityWorkOrderCompleted -> FacilityAsset.returnFromMaintenance (maintenance -> operational)
    // Middleware (not a reaction) because the COMPLETED leg's assetId is the work order's OWN
    // field, NOT a `complete` param (declared event fields are never auto-populated from self.*),
    // and the CREATED leg needs guard-safety (sendToMaintenance guards status == "operational")
    // — load the asset and skip cleanly rather than firing blindly and relying on the engine
    // swallowing the FSM-guard failure. Pure runtime addition, no IR/source change.
    createFacilityWorkOrderAssetStatusMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Logistics: LogisticsDispatch lifecycle -> Driver/Vehicle status. Keeps fleet
    // availability in lockstep with the dispatch a driver/vehicle is working:
    //   LogisticsDispatchAssigned  -> Driver.setOnRoute  + Vehicle.setInUse
    //   LogisticsDispatchDelivered -> Driver.setAvailable + Vehicle.setAvailable
    //   LogisticsDispatchFailed    -> Driver.setAvailable + Vehicle.setAvailable
    // Middleware (not a reaction) because driverId/vehicleId are the dispatch's OWN
    // fields, NOT deliver/fail command params (declared event fields are never
    // auto-populated from self.*) — it loads the dispatch via _subject.id and reads
    // them. The four status commands make the previously-UNREACHABLE Driver "on_route"
    // / Vehicle "in_use" states live. Guard-safe: a driver/vehicle already busy or
    // already free is skipped (free idempotency). Reassign deferred (needs two-hook
    // capture of the previous driver/vehicle). Pure runtime + additive IR commands.
    createLogisticsDispatchDriverVehicleStatusMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Logistics: LogisticsRoute lifecycle -> Driver/Vehicle status. Sibling of the
    // dispatch leg above, reusing the same four status commands (NO IR change):
    //   LogisticsRouteStarted   -> Driver.setOnRoute  + Vehicle.setInUse
    //   LogisticsRouteCompleted -> Driver.setAvailable + Vehicle.setAvailable
    //   LogisticsRouteCancelled -> Driver.setAvailable + Vehicle.setAvailable
    // Middleware (not a reaction) because driverId/vehicleId are the route's OWN
    // fields, NOT start/complete/cancel command params (declared event fields are
    // never auto-populated from self.*) — it loads the route via _subject.id. PRECEDENCE
    // (route <-> dispatch overlap): the busy leg is unconditional + FSM-guard-safe; the
    // free legs free the fleet ONLY when no OTHER active route/dispatch still commits
    // them, so route completion never frees a driver/vehicle mid-delivery (the dispatch
    // sibling's deliver/fail frees them instead).
    createLogisticsRouteDriverVehicleStatusMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Staff training: TrainingAttemptSubmitted -> TrainingAttempt.create.
    // Middleware (not a reaction) because the attempt's attemptNumber
    // (= TrainingAssignment.attemptCount post-increment), passThresholdPercent,
    // and managerReviewRequired are the assignment's OWN fields, NOT submit-command
    // params — declared event fields are never auto-populated from self.*. The old
    // `on TrainingAttemptSubmitted run TrainingAttempt.create` reaction resolved
    // payload.result.attemptCount/passThresholdPercent/managerReviewRequired off a
    // MUTATE command (result = the last mutate's scalar), so every ref was undefined
    // and no attempt ledger row was ever recorded. The middleware loads the
    // just-mutated TrainingAssignment via _subject.id, reads those fields, derives
    // passed = scorePercent >= threshold, and dispatches the governed
    // TrainingAttempt.create (idempotent per attemptId).
    createTrainingAttemptSubmittedRecordMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Staff onboarding: StaffMemberCreated -> TrainingAssignment.create. Middleware
    // (not a reaction) because the staff member id is a COMPUTED (self.id), not a
    // StaffMember.create param, and firstShiftAt/dueAt are not knowable at create
    // time — so the old `on StaffMemberCreated run TrainingAssignment.create`
    // reaction read undefined payload fields and silently no-op'd, leaving every new
    // staff member without their mandatory SEL onboarding assignment. The middleware
    // resolves the new id from _subject.id, pins staffRole to "staff" (the create's
    // guard), and dispatches TrainingAssignment.create with dueDateReviewNeeded=true
    // (the due date is pinned later by applyFirstShiftDueDate). Idempotent per
    // (tenant, staff member, SEL module).
    createStaffMemberCreatedTrainingAssignmentMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Compliance: EmployeeCertificationExpired/Revoked -> Notification for the
    // affected employee. Middleware (not a reaction) because expire()/revoke() are
    // MUTATE commands and the recipient (EmployeeCertification.employeeId) is the
    // cert's OWN field, never auto-populated onto the event payload — so the leg
    // must LOAD the certification via _subject.id to read the employee. Both lapse
    // events previously had ZERO consumers, so a lapsed/pulled credential notified
    // no one. Guard-safe + idempotent (single-shot FSM transitions; per-cert key).
    createEmployeeCertificationLapsedNotifyMiddleware({
      storeProvider,
      dispatchCommand: dispatchNotificationAsSystem,
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Compliance: EmployeeCertificationExpired/Revoked -> suspend the employee's
    // EmployeeAvailability rows (sibling of the notify leg). Middleware (not a reaction)
    // because it is a 1:N fan-out (one lapse -> every active availability row for the
    // employee) AND the employee FK is the cert's OWN field, never on the MUTATE-command
    // payload — so the leg LOADS the cert via _subject.id, then queries EmployeeAvailability
    // by employeeId and dispatches the existing governed suspend(reason) per active row. A
    // lapsed compliance credential should pull the employee off the schedule until renewed;
    // suspend is REVERSIBLE (reinstate) so the cascade is safe. Guard-safe + idempotent
    // (skips already-suspended/deleted rows; per-(cert, availability) key). No IR change.
    createEmployeeCertificationLapsedSuspendAvailabilityMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Staff onboarding: ScheduleShiftCreated -> TrainingAssignment.applyFirstShiftDueDate.
    // Middleware (not the orphan "emit + reaction") because the SEL onboarding
    // assignment is created with no due date (firstShiftAt unknown at staff-create
    // time) and the due date must be pinned to the staff member's FIRST scheduled
    // shift. applyFirstShiftDueDate resolves its target via `assignmentId == self.id`
    // (not derivable from a shift payload) and "first shift" is a stateful fact — so
    // the old `on StaffMemberFirstShiftScheduled run applyFirstShiftDueDate` reaction
    // was an unfireable orphan (no command emitted the event). The middleware looks up
    // the employee's open SEL assignment that still needs its due date pinned
    // (dueDateReviewNeeded == true), sets dueDate = shiftStart, and the command clears
    // the flag so later shifts don't re-pin (first-shift-only idempotency).
    createScheduleShiftFirstShiftDueDateMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Staffing: SchedulePublished -> Notification per distinct shift employee.
    // Middleware (not a reaction) for two reasons: it is a 1:N fan-out (one
    // Schedule -> many ScheduleShift rows -> one Notification per distinct
    // employee), and the recipients are NOT on the SchedulePublished payload
    // (scheduleId/scheduleDate/shiftCount/publishedBy/publishedAt only) — the
    // employee ids live on the ScheduleShift rows and must be queried by
    // scheduleId. Without this, publishing a schedule silently told no one.
    createSchedulePublishedNotifyStaffMiddleware({
      storeProvider,
      dispatchCommand: dispatchNotificationAsSystem,
    }),
    // Workforce AI: PerformancePredictionCreated -> Notification.create for the
    // predicted employee, but ONLY when the prediction flags a real risk (a high
    // overtime-risk score or a low productivity score). Middleware (not a reaction)
    // because the propagation is CONDITIONAL on a per-type threshold — a reaction is
    // an unconditional 1:1 mapping and would alert on every prediction or none — and
    // the authoritative tenantId is loaded from the prediction (not on the payload).
    // The event was an orphan (no consumer), so AI predictions surfaced to no one.
    createPerformancePredictionRiskNotifyMiddleware({
      storeProvider,
      dispatchCommand: dispatchNotificationAsSystem,
    }),
    // Staffing: TimeOffRequestApproved -> remove the employee's conflicting shifts.
    // Middleware (not a reaction) because it is a 1:N fan-out (one approved request
    // -> many ScheduleShift rows) AND the fields needed to find the conflicts
    // (employeeId/startDate/endDate) are the TimeOffRequest's OWN fields, not
    // `approve` params — the TimeOffRequestApproved payload carries only
    // {requestId, processedBy, processedAt}, so the request is loaded via _subject.id
    // and the shifts queried by employee + date. Approving PTO without this left the
    // employee both on approved leave AND rostered to work (a double-booking).
    createTimeOffApprovedShiftCleanupMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Staffing: StaffMemberDeactivated -> unassign the staff member's open
    // EventStaff assignments. Middleware (not a reaction) because it is a 1:N
    // fan-out (one deactivated staff member -> many open EventStaff rows). Scoped
    // to EventStaff only: EventStaff.staffMemberId belongsTo StaffMember (same id
    // space), whereas ScheduleShift.employeeId belongsTo User (a DIFFERENT id
    // space), so a ScheduleShift leg here would be an identity mismatch. Only
    // pre-work assignments (assigned/confirmed — exactly EventStaff.unassign's
    // guard) are touched, so a deactivated person stops showing as still-rostered
    // on upcoming events. Without this, deactivation left every assignment live.
    createStaffMemberDeactivatedUnassignEventStaffMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Staffing: OpenShiftClaimed -> ScheduleShift.create. Middleware (not a
    // reaction) because OpenShift.claim(claimedBy) is a MUTATE whose payload carries
    // only claimedBy — the shift's scheduleId/role/shiftStart/shiftEnd are the
    // OpenShift's OWN fields (declared event fields are never auto-populated from
    // self.*), and ScheduleShift.create additionally needs a locationId that lives
    // on the parent Schedule. So it loads the claimed OpenShift via _subject.id +
    // the parent Schedule for locationId, then materializes the claimed shift as a
    // governed ScheduleShift. Without this, claiming an open shift produced NO real
    // shift on the roster — the claim was silently dropped.
    createOpenShiftClaimedCreateScheduleShiftMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Staffing: ScheduleShiftCreated/Removed -> Schedule.syncShiftCount. Middleware
    // (not a reaction) because the count is a cross-entity scan of ScheduleShift
    // rows, and ScheduleShift.remove's payload carries no scheduleId (declared event
    // fields are never auto-populated from self.*) — the soft-deleted row is loaded
    // via _subject.id to recover it. RECOMPUTE, not +/- deltas: the stored
    // Schedule.shiftCount was maintained on NO path, so it stayed 0 and starved the
    // approve guard (shiftCount > 0) + release blockNoShifts constraint — a real
    // approval/publish deadlock. Dispatches the absolute, idempotent syncShiftCount
    // only when the stored count drifted from the true non-deleted shift count.
    createScheduleShiftCountMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // CRM: ProposalLineItemCreated/Removed -> Proposal.increment/decrementLineItemCount.
    // Middleware (not a reaction) because the parent proposalId is the line item's OWN
    // field: it rides the payload on `create` (an input param) but NOT on `remove`
    // (remove(userId) takes no proposalId, and declared event fields are never
    // auto-populated from self.*) — so a `resolve payload.proposalId` reaction would
    // silently no-op on the remove leg. Keeps the STORED `lineItemCount` truthful so
    // the inlined `Proposal.send` gate (`self.lineItemCount > 0`) lets a proposal with
    // line items actually send (it blocked EVERY send before — the gate read the
    // `hasLineItems` COMPUTED, which the runtime does not resolve inside constraints).
    createProposalLineItemCountMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // CRM: EventCreated -> ClientInteraction.create. Middleware (not the reaction
    // the plan first proposed) because ClientInteraction.create REQUIRES a
    // non-empty employeeId (command guard + validEmployeeId block constraint) and
    // EventCreated carries no creator field — Event.create has no userId/createdBy
    // param and declared event fields are never auto-populated from self.*, so a
    // reaction's payload.employeeId is structurally undefined and the create guard
    // could never pass. The middleware sources the employee from the acting user
    // (who booked the event = the right CRM attribution), reads clientId/title off
    // the payload, and logs a governed "note" interaction on the client's timeline.
    // Skips clientless events; idempotent per event via correlationId.
    createEventCreatedClientInteractionMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Event: EventFinalized -> log a post-event CRM interaction on the client's
    // timeline (the completion bookend of the EventCreated booking interaction
    // above). Middleware (not a reaction) because ClientInteraction.create needs
    // the event's clientId/title, which are the Event's OWN fields and never ride
    // the EventFinalized payload — so it loads the finalized Event via _subject.id.
    // Attribution = the finalizing user (a real finalize param). Skips clientless
    // events; idempotent per event (completion-subject-namespaced so it coexists
    // with the booking interaction). Sync: a single lightweight dispatch.
    createEventFinalizedClientInteractionMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Event: EventFinalized -> open an actionable post-event EventFollowup task
    // (the action-item counterpart of the passive ClientInteraction note above).
    // Middleware (not a reaction) because EventFollowup.create needs eventId in
    // the body (the source event's own id, only reachable via _subject.id — not a
    // finalize param), enriches the description with the Event's title (its OWN
    // field), and dedups against existing follow-ups. Assigned to the finalizing
    // user; idempotent per event (namespaced by the auto taskType). Works for
    // clientless events too. Sync: a single lightweight dispatch.
    createEventFinalizedFollowupCreateMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Event: EventFinalized -> release reserved inventory stranded by prep lists
    // that were finalized (reserved) but never completed/cancelled before the
    // event closed. Middleware (not a reaction) because it is a 1:N fan-out
    // (event -> prep lists -> prep items) and the reserved quantities are only
    // reachable via store loads keyed off the finalized event, not the finalize
    // payload. The releaseReservation `quantityReserved > 0` precondition makes
    // it a clean no-op for already-completed/cancelled lists, so it recovers only
    // genuinely-stranded reservations (an event is finalized XOR cancelled, so no
    // overlap with the EventCancelled cascade's inventory leg). Sync, like the
    // sibling finalized legs.
    createEventFinalizedReleaseReservationMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Events: EventUpdated/EventDateUpdated/EventLocationUpdated -> re-sync the
    // event's battle boards. Middleware (not a reaction) because boards are 1:N
    // by eventId AND the snapshot fields are the Event's own fields, absent from
    // the partial update-event payloads — so it loads the updated Event and fans
    // out BattleBoard.syncFromEvent per board. Retires the imperative
    // syncBattleBoardsForEvent() server-action helper.
    //
    // ASYNC PILOT: when the Postgres async-reaction queue is wired (production
    // with DB), this middleware ENQUEUES jobs and returns immediately — the
    // worker drains them via the registered `eventUpdatedBoardSync` handler.
    // Slow 1:N fan-outs no longer block the original command response. Falls
    // back to synchronous dispatch in test/dev without DB.
    createEventUpdatedBoardSyncMiddleware({
      storeProvider,
      findLinkedBoards: async (tenantId, eventId) => {
        // `battleBoard` is the Prisma model delegate; `PrismaLike` only
        // declares `$transaction` + `user` (the delegates the factory touches
        // directly). The transaction client carries an index signature, so the
        // access works at runtime on both — cast through `asStoreClient` to
        // bridge the structural mismatch (same pattern the store constructors
        // use; this is the documented Type bridge site in this module).
        const battleBoardDelegate = asStoreClient<{
          findMany: (args: {
            where: { tenantId: string; eventId: string; deletedAt: null };
            select: Record<string, boolean>;
          }) => Promise<
            Array<{
              id: string;
              tenantId: string;
              eventId: string;
              deletedAt: Date | null;
            }>
          >;
        }>(prismaForWrites);
        const rows = await battleBoardDelegate.findMany({
          where: { tenantId, eventId, deletedAt: null },
          select: { id: true, tenantId: true, eventId: true, deletedAt: true },
        });
        return rows.map((row) => ({
          id: row.id,
          tenantId: row.tenantId,
          eventId: row.eventId,
          deletedAt: row.deletedAt,
        }));
      },
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Events: EventLocationUpdated -> re-sync the venue on the event's ACTIVE
    // catering orders. Sibling of the board-sync leg above (split per PR):
    // middleware (not a reaction) because orders are 1:N by eventId. Syncs only
    // venueName/venueAddress (the venue fields the Event owns) and skips
    // delivered/completed/cancelled orders (physical history must not be
    // rewritten). Loads the updated Event and fans out CateringOrder.syncVenue.
    createEventLocationCateringSyncMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Events: EventStaffAssigned (from EventStaff.assign AND the bootstrap create)
    // -> notify the assigned staff member. Middleware (not a reaction) so it can
    // load the Event for its title and compose a useful message ("assigned to
    // <event> as <role>"); the title is the Event's own field, absent from the
    // assignment payload. Recipient = the assignment's staffMemberId; idempotent
    // per (eventStaffId, staffMemberId) so the create/assign double-emit notifies once.
    createEventStaffAssignedNotifyMiddleware({
      storeProvider,
      dispatchCommand: dispatchNotificationAsSystem,
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Events: EventCancelled -> cascade-cancel children. Middleware (not a
    // reaction) because each leg is a 1:N fan-out by eventId (EventStaff.unassign,
    // CateringOrder.cancel, PrepList.cancel, Invoice.voidInvoice,
    // CollectionCase.close) that a single-target reaction cannot resolve. Each
    // leg is guard-safe + idempotent; inventory reservations release via the
    // prep-list-cancelled middleware above (the dispatched PrepList.cancel chains).
    createEventCancelledCascadeMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Procurement: VendorBlacklisted -> cancel the vendor's open PurchaseOrders.
    // Middleware (not a reaction) because it is a 1:N fan-out by vendorId (one
    // blacklisted Vendor -> many open POs) that a single-target reaction cannot
    // resolve, and the vendorId is reachable only as event.subject?.id (not a
    // blacklist param; declared event fields are never auto-populated from self.*).
    // Scoped to BLACKLIST ONLY (a permanent, terminal ban) — NOT suspend, which is
    // reversible via approve, so cancelling a suspended vendor's in-flight POs would
    // be wrong if the pause is lifted (same permanent-vs-reversible split as the Dish
    // deactivate/eightySix precedent). Without this, blacklisting a vendor for cause
    // left every open PO still orderable/receivable/payable. Guard- and
    // transition-safe (only draft/submitted/approved/ordered/partially_received,
    // non-deleted POs are cancelled; received/cancelled/rejected are skipped) +
    // idempotent per (vendor, PO). PurchaseRequisition has no vendor FK on its header
    // and InventorySupplier is a distinct entity from the procurement Vendor PO.vendorId
    // points at — both out of scope.
    createVendorBlacklistedCancelPurchaseOrdersMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Core/collaboration: EmailTemplateDeleted -> EmailWorkflow.setActive(false).
    // Middleware (not a reaction) because it is a 1:N fan-out by emailTemplateId (one
    // deleted EmailTemplate -> many dependent EmailWorkflows) that a single-target
    // reaction cannot resolve, and the templateId is reachable only as event.subject?.id
    // (softDelete() takes no params, so the declared templateId event field is never
    // auto-populated from self.*). Without this, EmailTemplateDeleted had ZERO consumers:
    // soft-deleting a template left every workflow referencing it ACTIVE, so the trigger
    // service kept firing those workflows against a missing template (broken/empty mail).
    // SAFE to cascade (unlike ClientArchived -> withdraw Proposals, deferred) because
    // setActive is REVERSIBLE — a recreated template can be re-linked + re-activated, so
    // the permanent-vs-reversible split (vendor-suspend / dish-eightySix) does not apply.
    // Guard-safe + idempotent: only ACTIVE, non-deleted workflows are toggled (skips
    // already-inactive so no spurious EmailWorkflowUpdated; skips deleted so setActive's
    // deletedAt==null guard never trips). setActive policy (manager/admin/system) is a
    // superset of softDelete's (manager/admin), so the common path always aligns.
    createEmailTemplateDeletedDeactivateWorkflowsMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      ...(asyncDispatch ? { asyncEnqueue: asyncDispatch } : {}),
    }),
    // Integrations: EmailTemplateDeleted -> SmsAutomationRule.deactivate(). The SMS
    // sibling of the EmailWorkflow leg above — SmsAutomationRule belongsTo EmailTemplate
    // via templateId (sms-automation-rules.manifest:97), so a soft-deleted template left
    // every dependent rule ACTIVE and the SMS trigger service kept firing them against a
    // template whose content no longer exists (broken/empty SMS). Middleware for the same
    // reasons as the EmailWorkflow leg: 1:N fan-out by templateId, and the templateId is
    // reachable only as event.subject?.id (softDelete() takes no params). SAFE +
    // REVERSIBLE (activate re-enables). Guard-safe + idempotent: only ACTIVE, non-deleted
    // rules whose templateId matches are toggled (custom-message-only rules with an empty
    // templateId are correctly left alone). Only the deactivate-on-delete leg; the broader
    // business-event -> SMS fan-out remains a separate, deferred feature.
    createEmailTemplateDeletedDeactivateSmsRulesMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Staffing: TimecardEditApproved -> TimeEntry.applyEdit. Middleware (not a
    // reaction) because the corrected values (requestedClockIn/Out/BreakMinutes) and
    // the target timeEntryId are the TimecardEditRequest's OWN fields, which
    // `approve(userId)` does not take as params — and declared event fields are never
    // auto-populated from self.*, so no reaction can carry them. Without this,
    // approving a timecard edit only flipped the request to "approved" and the
    // corrected clock times NEVER reached the TimeEntry (payroll/labor kept using the
    // uncorrected hours). Loads the approved request via _subject.id, reads its fields,
    // and dispatches the governed TimeEntry.applyEdit (guard-safe: skips deleted/missing
    // entries; clock-time coalescing lives in the command so a partial edit can't blank
    // a real time; idempotent per request). No double-apply (the non-governed bulk
    // route never writes corrected clock values back).
    createTimecardEditApprovedTimeEntryApplyMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Payroll: PayrollRunPaid -> PayrollPeriod.lock. Middleware (not a reaction)
    // because PayrollRun.markPaid() takes NO params, so the PayrollRunPaid payload
    // {...commandInput, result} carries only a paidAt scalar — the period to lock is
    // PayrollRun.payrollPeriodId, the run's OWN field, never auto-populated onto the
    // event. PayrollRunPaid had ZERO consumers, so a paid period stayed editable
    // (reopen / retroactive time-entry edits) and paid payroll could be altered after
    // the fact. Loads the run via _subject.id, reads self.payrollPeriodId, and
    // dispatches the governed PayrollPeriod.lock (guard-safe: only locks a "closed"
    // period — already-locked / still-open periods are skipped; idempotent per period).
    createPayrollRunPaidPeriodLockMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // Payroll: PayrollRunPaid -> close TipPool(s) + notify employees. The remaining
    // two legs of the same plan item (the lock leg is above). Both are middleware,
    // not reactions: markPaid() takes no params so the payload carries no run fields,
    // the pools are reached via the run->payrollPeriodId->TipPool.periodId chain
    // (1:N, no direct payrollRunId FK), and the recipients are the distinct
    // employeeIds on the run's PayrollLineItem rows (1:N, queried by payrollRunId).
    // Guard-safe (only allocated/distributed pools close) + idempotent per pool /
    // per (run, employee); the two legs are independent.
    createPayrollRunPaidCascadeMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
  ];

  // 8b. Wiring-completeness check: surface any drift between the middleware
  //     pipeline (MIDDLEWARE_PIPELINE_NAMES) and the middleware registry
  //     (MIDDLEWARE_REGISTRY). Info-level so a pre-existing gap never blocks
  //     engine creation; tighten to a throw once the pipeline is fully
  //     registry-driven. The length assertion guards the names array going
  //     stale relative to the middleware array (one position added without the
  //     other).
  if (middleware.length !== MIDDLEWARE_PIPELINE_NAMES.length) {
    deps.log.info(
      `[manifest-runtime] middleware pipeline length (${middleware.length}) != names length (${MIDDLEWARE_PIPELINE_NAMES.length}) — MIDDLEWARE_PIPELINE_NAMES is out of sync`
    );
  }
  const wiringDrift = diffRegistryVsWiring([...MIDDLEWARE_PIPELINE_NAMES]);
  if (
    wiringDrift.wiredButNotDeclared.length > 0 ||
    wiringDrift.declaredButNotWired.length > 0
  ) {
    deps.log.info(
      `[manifest-runtime] middleware wiring drift: wiredButNotDeclared=[${wiringDrift.wiredButNotDeclared.join(",")}] declaredButNotWired=[${wiringDrift.declaredButNotWired.join(",")}]`
    );
  }

  // 9. Field-level encryption provider (AES-256-GCM).
  //    Activated when ENCRYPTION_KEY env var is set (64-char hex string).
  //    When absent, encrypted properties are stored as plaintext (dev/test safe).
  //    Supports key rotation via ENCRYPTION_KEY_PREVIOUS env var.
  const encryptionProvider = createAesGcmEncryptionProvider();

  // 10. Assemble the runtime engine.
  //    customBuiltins injects the project's deterministic expression helpers
  //    (daysBetween/percent/containsAny/…) so guards and computed properties
  //    can call them. The middleware pipeline is passed directly to the engine
  //    via RuntimeOptions — no Proxy wrapping needed.
  //    auditSink is the official upstream Postgres adapter; outboxStore is the
  //    legacy-table adapter (createOutboxAdapter) so engine emits reach the
  //    /outbox/publish → SSE pipeline. Both replaced the previous custom
  //    outbox writer middleware.
  //    When undefined (no DB), the engine skips audit/outbox silently.
  engine = new ManifestRuntimeEngine(
    ir,
    { user, tenantId: user.tenantId, telemetry },
    {
      storeProvider,
      idempotencyStore,
      customBuiltins: createCustomBuiltins(),
      middleware,
      requireTenantContext: true,
      generateId: () => randomUUID(),
      now: () => Date.now(),
      ...(auditSink ? { auditSink } : {}),
      ...(outboxStore ? { outboxStore } : {}),
      ...(approvalStore ? { approvalStore } : {}),
      ...(deps.eventBus ? { eventBus: deps.eventBus } : {}),
      ...(deps.deterministicMode !== undefined && {
        deterministicMode: deps.deterministicMode,
      }),
      // The engine's evaluation budget is shared across a command's ENTIRE
      // synchronous cascade (reactions + middleware dispatches re-enter
      // runCommand under the outer command's budget — initEvalBudget is
      // re-entrant). The 10k default dies mid-cascade on real flows like
      // EventConfirmed -> prep-list seed -> N PrepListItem.create, leaving
      // partially-applied mutates. 250k keeps the runaway-expression bound
      // while giving legitimate cascades ~25x headroom.
      evaluationLimits: deps.evaluationLimits ?? {
        maxEvaluationSteps: 250_000,
      },
      ...(deps.profiling && { profiling: deps.profiling }),
      ...(deps.flagProvider && { flagProvider: deps.flagProvider }),
      ...(encryptionProvider && { encryptionProvider }),
    }
  );

  return engine;
}

// ---------------------------------------------------------------------------
// Async reaction handler registration
// ---------------------------------------------------------------------------

/**
 * Process-singleton async reaction store, set when {@link createManifestRuntime}
 * first wires it (production with DB). The worker route reads it via
 * {@link getAsyncReactionStore} so it doesn't need to reconstruct the store or
 * the pool. `undefined` in test / no-DB contexts — the worker route no-ops.
 */
let _asyncReactionStore: PostgresAsyncReactionStore | undefined;

/**
 * Accessor for the process-singleton async reaction store. The worker drain
 * route uses this; tests inject their own store directly into
 * {@link drainAsyncReactions}.
 */
export function getAsyncReactionStore():
  | PostgresAsyncReactionStore
  | undefined {
  return _asyncReactionStore;
}

/**
 * Tracks whether the handlers have been registered in this process. The
 * registry throws on duplicate registration, so a second createManifestRuntime
 * call (e.g. for a different tenant) must skip re-registering.
 */
let asyncReactionHandlersRegistered = false;

/**
 * Register the async reaction handlers with the singleton registry. Idempotent
 * across multiple `createManifestRuntime` calls in the same process — the
 * registry is shared, so handlers register ONCE.
 *
 * Data-driven: iterates {@link ASYNC_REACTION_HANDLER_MAP}, the single wiring
 * site for async reactions. Each entry there corresponds to a declaration in
 * {@link MIDDLEWARE_REGISTRY} (validated by the registry completeness test).
 *
 * To add a new async reaction:
 * 1. Declare it in `middleware/middleware-registry.ts` (`executionMode: "async"`
 *    + `asyncReactionName`).
 * 2. Author the handler (see `event-updated-board-sync-handler.ts`).
 * 3. Add one row to `ASYNC_REACTION_HANDLER_MAP` in
 *    `async-reactions/handler-map.ts` (keyed by the same `asyncReactionName`).
 * 4. Pass `asyncEnqueue` to the source middleware in the factory pipeline.
 */
function registerAsyncReactionHandlers(): void {
  if (asyncReactionHandlersRegistered) {
    return;
  }
  assertAsyncHandlerMapMatchesRegistry();
  asyncReactionRegistry.registerAll(
    ASYNC_REACTION_HANDLER_MAP.map(({ name, description, handler }) => ({
      name,
      description,
      handler,
    }))
  );
  asyncReactionHandlersRegistered = true;
}

/**
 * Verify the async handler map and the middleware registry agree on which
 * reactions are async. Catches the two drift classes the registry exists to
 * prevent:
 *  - a handler registered without a declaration (invisible to the audit graph)
 *  - a declaration without a handler (an async reaction that silently never runs)
 *
 * Throws on drift so a misconfigured deployment fails fast at boot.
 */
function assertAsyncHandlerMapMatchesRegistry(): void {
  const handlerNames = new Set(ASYNC_REACTION_HANDLER_MAP.map((r) => r.name));
  const declaredAsyncNames = new Set(
    getAsyncRegistryEntries()
      .map((e) => e.asyncReactionName)
      .filter((n): n is string => Boolean(n))
  );
  const handlersWithoutDeclaration = [...handlerNames]
    .filter((n) => !declaredAsyncNames.has(n))
    .sort();
  const declarationsWithoutHandler = [...declaredAsyncNames]
    .filter((n) => !handlerNames.has(n))
    .sort();
  if (
    handlersWithoutDeclaration.length === 0 &&
    declarationsWithoutHandler.length === 0
  ) {
    return;
  }
  const parts: string[] = [];
  if (handlersWithoutDeclaration.length > 0) {
    parts.push(
      `handlers without a registry declaration: ${handlersWithoutDeclaration.join(", ")}`
    );
  }
  if (declarationsWithoutHandler.length > 0) {
    parts.push(
      `registry declarations without a handler: ${declarationsWithoutHandler.join(", ")}`
    );
  }
  throw new Error(
    `[manifest-runtime] async handler map out of sync with middleware registry — ${parts.join("; ")}. ` +
      "Add the missing row to ASYNC_REACTION_HANDLER_MAP and/or the MIDDLEWARE_REGISTRY entry."
  );
}

// Re-export types that consumers may need.
export type { RuntimeEngine } from "@angriff36/manifest";
