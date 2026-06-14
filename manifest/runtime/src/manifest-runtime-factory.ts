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
  createCollectionPaymentRecordedInvoiceApplyMiddleware,
  createContractSignedEventConfirmMiddleware,
  createIdentityMiddleware,
  createInventoryMovementTransactionMiddleware,
  createLeadConvertedDealCreateMiddleware,
  createMaintenanceCompletedEquipmentRecordMiddleware,
  createPaymentProcessedInvoiceApplyMiddleware,
  createPaymentRefundedInvoiceRecordMiddleware,
  createPrepInventoryDemandMiddleware,
  createPrepListCompletedConsumeMiddleware,
  createPrepListSeedMiddleware,
  createRbacMiddleware,
  createShipmentItemReceivedInventoryRestockMiddleware,
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
    // CRM: LeadConvertedToClient -> Deal.create. Middleware (not a reaction)
    // because the deal's title/value are the Lead's OWN fields, which
    // convertToClient does not take as params — the middleware loads the
    // converted Lead from the store and dispatches the governed Deal.create.
    createLeadConvertedDealCreateMiddleware({
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
