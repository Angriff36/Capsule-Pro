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

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  EmittedEvent,
  Middleware,
  RuntimeEngine,
  RuntimeOptions,
} from "@angriff36/manifest";
import { PostgresApprovalStore } from "@angriff36/manifest/approval/postgres";
import { PostgresAuditSink } from "@angriff36/manifest/audit/postgres";
import type { IR, IRCommand } from "@angriff36/manifest/ir";
import { PostgresOutboxStore } from "@angriff36/manifest/outbox/postgres";
import { createAesGcmEncryptionProvider } from "./encryption-provider";
import { resolvePrismaModelKey } from "./generated/entity-to-prisma-model.generated";
// LIVE schema metadata (NOT the IR-projection manifest-prisma-store-metadata):
// the projection metadata describes the IR-projected schema whose delegates
// (e.g. "event_staffs") don't exist on the live PrismaClient — GenericPrismaStore
// threw at construction for 173/191 entities. See build-prisma-store-options.mjs.
import { PRISMA_MODEL_METADATA } from "./generated/prisma-model-metadata.generated";
import { createCustomBuiltins } from "./manifest-builtins";
import {
  createClientInteractionEscalatedNotifyMiddleware,
  createClientInteractionOverdueNotifyMiddleware,
  createCollectionPaymentRecordedInvoiceApplyMiddleware,
  createCollectionWrittenOffInvoiceWriteOffMiddleware,
  createContractSignedEventConfirmMiddleware,
  createDealLifecyclePropagationMiddleware,
  createDishDeactivatedPruneMiddleware,
  createEventCancelledCascadeMiddleware,
  createEventCreatedClientInteractionMiddleware,
  createEventDishPrepSyncMiddleware,
  createEventGuestCountPrepRescaleMiddleware,
  createEventLocationCateringSyncMiddleware,
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
  createLeadConvertedDealCreateMiddleware,
  createMaintenanceCompletedEquipmentRecordMiddleware,
  createMaintenanceCreatedEquipmentStatusMiddleware,
  createPaymentPlanCompletedCollectionCaseResolveMiddleware,
  createPaymentProcessedInvoiceApplyMiddleware,
  createPaymentRefundedInvoiceRecordMiddleware,
  createPayrollRunPaidPeriodLockMiddleware,
  createPrepInventoryDemandMiddleware,
  createPrepListCancelledReleaseReservationMiddleware,
  createPrepListCompletedConsumeMiddleware,
  createPrepListSeedMiddleware,
  createPrepTaskStationCountMiddleware,
  createProposalLifecycleLeadStatusMiddleware,
  createProposalLineItemCountMiddleware,
  createRbacMiddleware,
  createSchedulePublishedNotifyStaffMiddleware,
  createScheduleShiftFirstShiftDueDateMiddleware,
  createTimeOffApprovedShiftCleanupMiddleware,
  createShipmentItemReceivedInventoryRestockMiddleware,
  createStaffMemberCreatedTrainingAssignmentMiddleware,
  createStaffMemberDeactivatedUnassignEventStaffMiddleware,
  createTimecardEditApprovedTimeEntryApplyMiddleware,
  createTrainingAttemptSubmittedRecordMiddleware,
  createVendorBlacklistedCancelPurchaseOrdersMiddleware,
} from "./middleware";
import { loadRolePolicies } from "./permission-guard";
import { ensureManifestSchema, getPool } from "./pg-pool";
import { PrismaIdempotencyStore } from "./prisma-idempotency-store";
import { PrismaJsonStore } from "./prisma-json-store";
import type { PrismaStoreConfig } from "./prisma-store";
import { createPrismaOutboxWriter, PrismaStore } from "./prisma-store";
import {
  loadMergedPrecompiledIR,
  loadPrecompiledIR,
  verifyProvenanceHash,
} from "./runtime/loadManifests";
import { ManifestRuntimeEngine } from "./runtime-engine";

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
  /** Feature-flag resolver for the `flag()` builtin. Without it, `flag()` returns false. */
  flagProvider?: (name: string) => unknown;
  /** Idempotency configuration (Phase 2: failureTtlMs plumbing). */
  idempotency?: { failureTtlMs?: number };
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
  "PrepTaskPlanWorkflow",
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

  // 3. Create a shared event collector for transactional outbox pattern.
  const eventCollector: EmittedEvent[] = [];

  // 4. Build the store provider — entities with dedicated Prisma models use
  //    PrismaStore; everything else falls back to PrismaJsonStore.
  const storeProvider: RuntimeOptions["storeProvider"] = (
    entityName: string
  ) => {
    if (hasTypedStore(entityName)) {
      const outboxWriter = createPrismaOutboxWriter(entityName, user.tenantId);

      const config: PrismaStoreConfig = {
        prisma: asStoreClient<PrismaStoreConfig["prisma"]>(prismaForWrites),
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
    return new PrismaJsonStore({
      prisma:
        asStoreClient<
          ConstructorParameters<typeof PrismaJsonStore>[0]["prisma"]
        >(prismaForWrites),
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
    }),
    // CRM: LeadConvertedToClient -> Deal.create. Middleware (not a reaction)
    // because the deal's title/value are the Lead's OWN fields, which
    // convertToClient does not take as params — the middleware loads the
    // converted Lead from the store and dispatches the governed Deal.create.
    createLeadConvertedDealCreateMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
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
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // CRM: ClientInteractionMarkedOverdue -> Notification.create for the assignee.
    // Middleware (not a reaction) because `markOverdue()` takes NO params, so the
    // emitted payload carries no entity fields (declared event fields are never
    // auto-populated from self.*) — the recipient (employeeId), subject, and tenantId
    // are the interaction's OWN fields and must be LOADED from the store. The event
    // was an orphan (no consumer), so overdue follow-ups generated zero signal.
    createClientInteractionOverdueNotifyMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
    }),
    // CRM: ClientInteractionEscalated -> Notification.create for the escalation
    // TARGET (escalatedTo), the sibling of the overdue leg. Middleware because the
    // notification needs the interaction's OWN subject/tenantId (never auto-populated
    // onto the event payload) — loaded from the store. The event was an orphan, so
    // escalations produced zero in-app signal for the person they were handed to.
    createClientInteractionEscalatedNotifyMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
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
    createShipmentItemReceivedInventoryRestockMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
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
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
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
    }),
    // Events: EventUpdated/EventDateUpdated/EventLocationUpdated -> re-sync the
    // event's battle boards. Middleware (not a reaction) because boards are 1:N
    // by eventId AND the snapshot fields are the Event's own fields, absent from
    // the partial update-event payloads — so it loads the updated Event and fans
    // out BattleBoard.syncFromEvent per board. Retires the imperative
    // syncBattleBoardsForEvent() server-action helper.
    createEventUpdatedBoardSyncMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
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
    }),
    // Events: EventStaffAssigned (from EventStaff.assign AND the bootstrap create)
    // -> notify the assigned staff member. Middleware (not a reaction) so it can
    // load the Event for its title and compose a useful message ("assigned to
    // <event> as <role>"); the title is the Event's own field, absent from the
    // assignment payload. Recipient = the assignment's staffMemberId; idempotent
    // per (eventStaffId, staffMemberId) so the create/assign double-emit notifies once.
    createEventStaffAssignedNotifyMiddleware({
      storeProvider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
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
  let approvalStore: PostgresApprovalStore | undefined;
  if (dbUrl) {
    await ensureManifestSchema();
    const pool = getPool();
    auditSink = new PostgresAuditSink({ pool });
    outboxStore = new PostgresOutboxStore({
      pool,
      projectSubject: true,
    });
    approvalStore = new PostgresApprovalStore({ pool });
  }

  // 9b. Field-level encryption provider (AES-256-GCM).
  //    Activated when ENCRYPTION_KEY env var is set (64-char hex string).
  //    When absent, encrypted properties are stored as plaintext (dev/test safe).
  //    Supports key rotation via ENCRYPTION_KEY_PREVIOUS env var.
  const encryptionProvider = createAesGcmEncryptionProvider();

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
      generateId: () => randomUUID(),
      now: () => Date.now(),
      ...(auditSink ? { auditSink } : {}),
      ...(outboxStore ? { outboxStore } : {}),
      ...(approvalStore ? { approvalStore } : {}),
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

// Re-export types that consumers may need.
export type { RuntimeEngine } from "@angriff36/manifest";
