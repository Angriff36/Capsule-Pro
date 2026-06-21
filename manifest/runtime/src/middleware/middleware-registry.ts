/**
 * First-class middleware registry — the single discoverable location for every
 * cross-entity reaction in the Manifest runtime layer.
 *
 * # Why this exists
 * Middleware files were scattered across `middleware/` with inconsistent,
 * buried contracts for idempotency, error handling, and subject loading. There
 * was no single place to answer "which cross-entity mutations exist?", "what is
 * async?", or "what does `PaymentProcessed` trigger?". This module is that
 * place: each entry declares the triggering event, the target command, the
 * input-mapping mode, the idempotency-key derivation, and the execution/retry
 * policy as a typed, queryable, auditable contract.
 *
 * # Relationship to the imperative middleware
 * The middleware files keep their imperative load+guard+dispatch logic (several
 * use a two-hook before-guard state-capture pattern, custom store queries, or
 * no-`storeProvider` variants that a pure declaration cannot express). This
 * registry is the CONTRACT layer over them: it documents the propagation graph
 * and is consumed by the factory for (a) data-driven async-handler registration
 * and (b) wiring-completeness validation. A future increment may collapse the
 * factory's per-middleware construction into a registry-driven loop once the
 * special cases are normalized.
 *
 * # Adding a new cross-entity reaction
 * 1. Author the middleware factory under `middleware/<name>-middleware.ts`.
 * 2. Add a {@link MiddlewareRegistryEntry} to {@link MIDDLEWARE_REGISTRY} below.
 * 3. If async, also add the handler to `async-reactions/handler-map.ts` and set
 *    `executionMode: "async"` + `asyncReactionName` here.
 * 4. Wire the factory construction (the imperative call site).
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Typed contract
// ---------------------------------------------------------------------------

/**
 * The lifecycle hook(s) a reaction attaches to.
 *
 * - `after-emit`     — runs after the command's events are emitted (the common
 *   case; the reaction observes the post-mutation state).
 * - `before-guard`   — runs before guards evaluate (captures pre-mutation state).
 * - `two-hook`       — captures state on `before-guard` AND applies on
 *   `after-emit`. Required when the reaction needs a value the command's
 *   `mutate` destroys (e.g. old guest count, pre-recount on-hand). These
 *   CANNOT be moved to async — the pre-mutation state is gone by worker time.
 */
export type MiddlewareHook = "after-emit" | "before-guard" | "two-hook";

/**
 * How the target command's input is derived.
 *
 * This is a declarative category (not the mapping function itself) so the
 * propagation graph is auditable without exposing implementation. The actual
 * derivation lives in the middleware file.
 *
 * - `load-and-derive` — loads the source entity via `_subject.id` and derives
 *   the target input from `self.*` fields that never ride the event payload.
 * - `payload`         — maps the target input directly from the triggering
 *   event's declared payload fields.
 * - `1:N-fan-out`     — queries N target rows by a foreign key and dispatches
 *   once per target (a reaction cannot do this — it resolves exactly one).
 * - `recompute`       — recomputes an absolute value (count, ratio) across a
 *   cross-entity scan and dispatches only when stored ≠ truth.
 * - `computed`        — derives the target input from the acting user / runtime
 *   context rather than entity fields.
 * - `multi-leg`       — dispatches several DIFFERENT target commands from one
 *   trigger (e.g. a cascade that cancels staff, orders, prep lists, invoices).
 */
export type InputMappingMode =
  | "load-and-derive"
  | "payload"
  | "1:N-fan-out"
  | "recompute"
  | "computed"
  | "multi-leg";

/**
 * Whether the reaction runs synchronously inside `runCommand` or is deferred to
 * the async durable queue (see `async-reactions/`).
 *
 * - `sync`           — runs inline; the caller's response waits for it.
 * - `async`          — the middleware ENQUEUES a job when the queue is wired
 *   (production w/ DB) and returns immediately; a worker drains it via the
 *   registered handler. Falls back to synchronous dispatch in dev/test.
 */
export type ExecutionMode = "sync" | "async";

/**
 * Retry policy for an async reaction. Mirrors `AsyncReactionQueueOptions`.
 * Omitted on sync entries (no retry — failures surface in the command result).
 */
export interface RetryPolicy {
  /** Base retry delay (ms); doubles each retry. */
  initialBackoffMs: number;
  /** Max delivery attempts before dead-letter routing. */
  maxAttempts: number;
  /** Cap on retry delay (ms). */
  maxBackoffMs: number;
}

/**
 * Declarative idempotency-key contract.
 *
 * - `{ template }`        — a key with `{placeholders}` derived from the
 *   triggering subject (e.g. `"payment-invoice:{tenantId}:{paymentId}:apply"`).
 *   At-least-once redelivery cannot double-execute.
 * - `{ perTarget: true }` — the key is derived per fan-out target, not per
 *   triggering subject (e.g. per received shipment line, per PO).
 * - `{ none: true }`      — the reaction is naturally idempotent (an overwrite
 *   sync or a recompute that dispatches only on drift) and needs no key.
 */
export type MiddlewareIdempotencyKey =
  | { template: string; perTarget?: boolean }
  | { none: true };

/**
 * The category bucket for grouping/auditing. Loosely mirrors the source domain.
 */
export type MiddlewareCategory =
  | "cross-cutting"
  | "events"
  | "kitchen"
  | "inventory"
  | "procurement"
  | "finance"
  | "crm"
  | "accounting"
  | "equipment"
  | "facilities"
  | "logistics"
  | "staffing"
  | "compliance"
  | "training"
  | "payroll"
  | "integrations"
  | "onboarding";

/**
 * One declared cross-entity reaction.
 *
 * This is the typed contract the feature requires: triggering event, target
 * command, input mapping, idempotency key, and retry policy — plus the metadata
 * needed to audit and wire it.
 */
export interface MiddlewareRegistryEntry {
  /**
   * Registered async reaction name (matches a handler in
   * `async-reactions/handler-map.ts`). Required when `executionMode: "async"`.
   */
  asyncReactionName?: string;
  /** Domain bucket for grouping. */
  category: MiddlewareCategory;
  /** One-line description of the propagation. */
  description: string;

  // ── Execution + retry policy ──────────────────────────────────────────────
  /** Sync (inline) or async (deferred to the durable queue). */
  executionMode: ExecutionMode;
  /** Lifecycle hook(s). `two-hook` entries cannot be made async. */
  hook: MiddlewareHook;

  // ── Idempotency contract ──────────────────────────────────────────────────
  /** Idempotency-key derivation (see {@link MiddlewareIdempotencyKey}). */
  idempotencyKey: MiddlewareIdempotencyKey;
  /** How the target input is derived (declarative — see {@link InputMappingMode}). */
  inputMapping: InputMappingMode;
  /** Stable, unique key (kebab-case; matches the middleware file stem). */
  name: string;
  /** Retry policy. Required for async; omitted for sync. */
  retryPolicy?: RetryPolicy;

  /**
   * Flag for middleware whose factory takes non-standard deps (custom store
   * query, no `storeProvider`, prisma-direct, etc.) and so is wired explicitly
   * in the factory rather than via the standard `storeProvider + dispatchCommand`
   * shape. The entry is still DECLARED here for audit completeness.
   */
  specialWiring?:
    | "board-sync"
    | "stock-sync"
    | "sample-data"
    | "identity"
    | "rbac";
  /** Command(s) dispatched on the target. Multiple for `multi-leg`. */
  targetCommand: string | string[];

  // ── Target contract ───────────────────────────────────────────────────────
  /** Entity whose governed command is dispatched. */
  targetEntity: string;
  /** Source command that emits the trigger (when scoped, e.g. only `process`). */
  triggeringCommand?: string;
  /** Source entity that emits the trigger (when scoped). */
  triggeringEntity?: string;

  // ── Trigger contract ──────────────────────────────────────────────────────
  /** Semantic event name(s) that trigger this reaction. */
  triggeringEvents: string[];
}

/**
 * The default retry policy applied to async entries that omit an explicit one.
 * Mirrors `DEFAULT_ASYNC_REACTION_POLICY` from the async-reactions subsystem.
 */
export const DEFAULT_REGISTRY_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  initialBackoffMs: 1000,
  maxBackoffMs: 60_000,
};

// ---------------------------------------------------------------------------
// The registry — THE single discoverable location
// ---------------------------------------------------------------------------

/**
 * Every cross-entity reaction in the runtime, declared once.
 *
 * Order is by category for readability; it does NOT imply execution order
 * (the factory owns pipeline ordering). Names are unique (validated by tests).
 */
export const MIDDLEWARE_REGISTRY: readonly MiddlewareRegistryEntry[] = [
  // ── Cross-cutting (identity / authorization / onboarding seed) ────────────
  // These are infrastructure middleware, not cross-entity propagations, but are
  // declared so the registry is the complete inventory of the middleware layer.
  {
    name: "identity",
    description:
      "Resolves the acting user's role from the DB before policy evaluation",
    category: "cross-cutting",
    triggeringEvents: [],
    hook: "before-guard",
    targetEntity: "User",
    targetCommand: "(role enrichment — no dispatch)",
    inputMapping: "computed",
    idempotencyKey: { none: true },
    executionMode: "sync",
    specialWiring: "identity",
  },
  {
    name: "rbac",
    description:
      "Enforces command-level RBAC permission checks against resolved role policies",
    category: "cross-cutting",
    triggeringEvents: [],
    hook: "before-guard",
    targetEntity: "(policy)",
    targetCommand: "(authorization gate — no dispatch)",
    inputMapping: "computed",
    idempotencyKey: { none: true },
    executionMode: "sync",
    specialWiring: "rbac",
  },
  {
    name: "sample-data-seed",
    description:
      "SampleData.seed/reseed/clear → populate/remove demo rows via direct Prisma writes",
    category: "onboarding",
    triggeringEvents: [
      "SampleDataSeeded",
      "SampleDataReseeded",
      "SampleDataCleared",
    ],
    triggeringEntity: "SampleData",
    hook: "after-emit",
    targetEntity: "(demo data)",
    targetCommand: "(bulk seed/clear — §9-permissible direct writes)",
    inputMapping: "computed",
    idempotencyKey: { none: true },
    executionMode: "sync",
    specialWiring: "sample-data",
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    name: "event-created-client-interaction",
    description:
      "EventCreated → ClientInteraction.create (attributed to the booking user)",
    category: "events",
    triggeringEvents: ["EventCreated"],
    triggeringEntity: "Event",
    hook: "after-emit",
    targetEntity: "ClientInteraction",
    targetCommand: "create",
    inputMapping: "computed",
    idempotencyKey: {
      template: "event-client-interaction:{tenantId}:{eventId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "eventCreatedClientInteraction",
  },
  {
    name: "event-finalized-client-interaction",
    description:
      "EventFinalized → ClientInteraction.create (post-event CRM follow-up; loads event for client/title)",
    category: "events",
    triggeringEvents: ["EventFinalized"],
    triggeringEntity: "Event",
    triggeringCommand: "finalize",
    hook: "after-emit",
    targetEntity: "ClientInteraction",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "event-finalized-interaction:{tenantId}:{eventId}",
    },
    executionMode: "sync",
  },
  {
    name: "event-updated-board-sync",
    description:
      "EventUpdated/DateUpdated/LocationUpdated → fan out BattleBoard.syncFromEvent per linked board",
    category: "events",
    triggeringEvents: [
      "EventUpdated",
      "EventDateUpdated",
      "EventLocationUpdated",
    ],
    triggeringEntity: "Event",
    hook: "after-emit",
    targetEntity: "BattleBoard",
    targetCommand: "syncFromEvent",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "board-sync:{tenantId}:{boardId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "eventUpdatedBoardSync",
    specialWiring: "board-sync",
  },
  {
    name: "event-location-catering-sync",
    description:
      "EventLocationUpdated → fan out CateringOrder.syncVenue per active order",
    category: "events",
    triggeringEvents: ["EventLocationUpdated"],
    triggeringEntity: "Event",
    hook: "after-emit",
    targetEntity: "CateringOrder",
    targetCommand: "syncVenue",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "event-catering-sync:{tenantId}:{orderId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "eventLocationCateringSync",
  },
  {
    name: "event-staff-assigned-notify",
    description:
      "EventStaffAssigned → Notification.create to the assigned staff member",
    category: "events",
    triggeringEvents: ["EventStaffAssigned"],
    triggeringEntity: "EventStaff",
    hook: "after-emit",
    targetEntity: "Notification",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "event-staff-notify:{tenantId}:{eventStaffId}:{staffMemberId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "eventStaffAssignedNotify",
  },
  {
    name: "event-cancelled-cascade",
    description:
      "EventCancelled → cascade unassign/cancel/void/close per eligible child",
    category: "events",
    triggeringEvents: ["EventCancelled"],
    triggeringEntity: "Event",
    hook: "after-emit",
    targetEntity: "EventStaff/CateringOrder/PrepList/Invoice/CollectionCase",
    targetCommand: ["unassign", "cancel", "voidInvoice", "close"],
    inputMapping: "multi-leg",
    idempotencyKey: {
      template: "event-cancel:{tenantId}:{childId}:{command}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "eventCancelledCascade",
  },
  {
    name: "event-guest-count-prep-rescale",
    description:
      "EventGuestCountUpdated → rescale draft PrepLists + items by new/old ratio",
    category: "events",
    triggeringEvents: ["EventGuestCountUpdated"],
    triggeringEntity: "Event",
    hook: "two-hook",
    targetEntity: "PrepList",
    targetCommand: "updateQuantity",
    inputMapping: "1:N-fan-out",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "event-dish-prep-sync",
    description:
      "EventDishCreated/QuantityUpdated → re-derive demand on draft PrepLists",
    category: "events",
    triggeringEvents: ["EventDishCreated", "EventDishQuantityUpdated"],
    triggeringEntity: "EventDish",
    hook: "after-emit",
    targetEntity: "PrepListItem",
    targetCommand: ["create", "updateQuantity"],
    inputMapping: "1:N-fan-out",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "contract-signed-event-confirm",
    description: "ContractSigned → Event.confirm (load contract for eventId)",
    category: "events",
    triggeringEvents: ["ContractSigned"],
    triggeringEntity: "EventContract",
    hook: "after-emit",
    targetEntity: "Event",
    targetCommand: "confirm",
    inputMapping: "load-and-derive",
    idempotencyKey: { template: "contract-confirm:{tenantId}:{contractId}" },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "contractSignedEventConfirm",
  },

  // ── Kitchen ───────────────────────────────────────────────────────────────
  {
    name: "prep-list-seed",
    description:
      "EventConfirmed → PrepList.create (seed) + PrepListFinalized → draft requisition",
    category: "kitchen",
    triggeringEvents: ["EventConfirmed", "PrepListFinalized"],
    hook: "after-emit",
    targetEntity: "PrepList",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: { template: "prep-seed:{tenantId}:{eventId}" },
    executionMode: "sync",
  },
  {
    name: "prep-inventory-demand",
    description:
      "PrepListFinalized → InventoryItem.reserve per derived ingredient demand",
    category: "kitchen",
    triggeringEvents: ["PrepListFinalized"],
    triggeringEntity: "PrepList",
    hook: "after-emit",
    targetEntity: "InventoryItem",
    targetCommand: "reserve",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "prep-demand:{tenantId}:{prepListId}:{itemId}",
      perTarget: true,
    },
    executionMode: "sync",
  },
  {
    name: "prep-list-completed-consume",
    description:
      "PrepListCompleted → InventoryItem.consume per item (draws down reservation)",
    category: "kitchen",
    triggeringEvents: ["PrepListCompleted"],
    triggeringEntity: "PrepList",
    hook: "after-emit",
    targetEntity: "InventoryItem",
    targetCommand: "consume",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "prep-consume:{tenantId}:{prepListId}:{itemId}",
      perTarget: true,
    },
    executionMode: "sync",
  },
  {
    name: "prep-list-cancelled-release-reservation",
    description:
      "PrepListCancelled → InventoryItem.releaseReservation per reserved item",
    category: "kitchen",
    triggeringEvents: ["PrepListCancelled"],
    triggeringEntity: "PrepList",
    hook: "after-emit",
    targetEntity: "InventoryItem",
    targetCommand: "releaseReservation",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "prep-release:{tenantId}:{prepListId}:{itemId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "prepListCancelledReleaseReservation",
  },
  {
    name: "prep-task-station-count",
    description:
      "PrepTask lifecycle → reconcile Station.CurrentTaskCount (recompute)",
    category: "kitchen",
    triggeringEvents: [
      "PrepTaskAssigned",
      "PrepTaskUnclaimed",
      "PrepTaskReleased",
      "PrepTaskCompleted",
      "PrepTaskCancelled",
      "PrepTaskReassigned",
    ],
    triggeringEntity: "PrepTask",
    hook: "after-emit",
    targetEntity: "Station",
    targetCommand: "syncTaskCount",
    inputMapping: "recompute",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "dish-deactivated-prune",
    description:
      "DishDeactivated → retire dish from PrepTasks/PrepListItems/EventDishes",
    category: "kitchen",
    triggeringEvents: ["DishDeactivated"],
    triggeringEntity: "Dish",
    hook: "after-emit",
    targetEntity: "PrepTask/PrepListItem/EventDish",
    targetCommand: ["cancel", "remove"],
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "dish-prune:{tenantId}:{dishId}:{targetId}",
      perTarget: true,
    },
    executionMode: "sync",
  },
  {
    name: "container-deactivated-dish-clear",
    description:
      "ContainerDeactivated → Dish.clearDefaultContainer per dependent dish",
    category: "kitchen",
    triggeringEvents: ["ContainerDeactivated"],
    triggeringEntity: "Container",
    hook: "after-emit",
    targetEntity: "Dish",
    targetCommand: "clearDefaultContainer",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "container-clear:{tenantId}:{containerId}:{dishId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "containerDeactivatedDishClear",
  },
  {
    name: "chart-of-account-deactivated-deactivate-children",
    description:
      "ChartOfAccountDeactivated → deactivate each active child (recursive subtree)",
    category: "accounting",
    triggeringEvents: ["ChartOfAccountDeactivated"],
    triggeringEntity: "ChartOfAccount",
    hook: "after-emit",
    targetEntity: "ChartOfAccount",
    targetCommand: "deactivate",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "coa-deactivate:{tenantId}:{childAccountId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "chartOfAccountDeactivatedDeactivateChildren",
  },
  {
    name: "ingredient-recalled-quarantine-inventory",
    description:
      "IngredientRecallFlagged → InventoryItem.softDelete (food-safety quarantine)",
    category: "kitchen",
    triggeringEvents: ["IngredientRecallFlagged"],
    triggeringEntity: "Ingredient",
    hook: "after-emit",
    targetEntity: "InventoryItem",
    targetCommand: "softDelete",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "ingredient-quarantine:{tenantId}:{ingredientId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "ingredientRecalledQuarantineInventory",
  },
  {
    name: "qa-check-failed-corrective-action",
    description:
      "QACheckFailed → QACorrectiveAction.create (loads check via _subject.id)",
    category: "kitchen",
    triggeringEvents: ["QACheckFailed"],
    triggeringEntity: "QACheck",
    hook: "after-emit",
    targetEntity: "QACorrectiveAction",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "qa-corrective:{tenantId}:{qaCheckId}",
    },
    executionMode: "sync",
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    name: "inventory-movement-transaction",
    description:
      "InventoryConsumed/Wasted/Restocked/Adjusted → InventoryTransaction.create (ledger)",
    category: "inventory",
    triggeringEvents: [
      "InventoryConsumed",
      "InventoryWasted",
      "InventoryRestocked",
      "InventoryAdjusted",
    ],
    triggeringEntity: "InventoryItem",
    hook: "after-emit",
    targetEntity: "InventoryTransaction",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "inv-ledger:{tenantId}:{itemId}:{movement}:{causationId}",
    },
    executionMode: "sync",
  },
  {
    name: "inventory-stock-sync-item",
    description:
      "InventoryStock.adjust/recount → InventoryItem.adjust (two-hook delta capture)",
    category: "inventory",
    triggeringEvents: ["InventoryStockAdjusted", "InventoryStockRecounted"],
    triggeringEntity: "InventoryStock",
    hook: "two-hook",
    targetEntity: "InventoryItem",
    targetCommand: "adjust",
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
    specialWiring: "stock-sync",
  },
  {
    name: "inventory-transfer-received-stock-movement",
    description:
      "TransferReceived → per-location InventoryStock movement (1:N across locations)",
    category: "inventory",
    triggeringEvents: ["TransferReceived"],
    triggeringEntity: "InventoryTransfer",
    hook: "after-emit",
    targetEntity: "InventoryStock",
    targetCommand: "adjust",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "transfer-move:{tenantId}:{transferId}:{locationId}",
      perTarget: true,
    },
    executionMode: "sync",
  },

  // ── Procurement ───────────────────────────────────────────────────────────
  {
    name: "shipment-item-received-inventory-restock",
    description:
      "ShipmentItemReceived → InventoryItem.restock (load line, preserve unitCost)",
    category: "procurement",
    triggeringEvents: ["ShipmentItemReceived"],
    triggeringEntity: "ShipmentItem",
    hook: "after-emit",
    targetEntity: "InventoryItem",
    targetCommand: "restock",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "shipment-restock:{tenantId}:{shipmentItemId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "shipmentItemReceivedInventoryRestock",
  },
  {
    name: "vendor-blacklisted-cancel-purchase-orders",
    description:
      "VendorBlacklisted → PurchaseOrder.cancel per open order (permanent ban only)",
    category: "procurement",
    triggeringEvents: ["VendorBlacklisted"],
    triggeringEntity: "Vendor",
    hook: "after-emit",
    targetEntity: "PurchaseOrder",
    targetCommand: "cancel",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "vendor-po-cancel:{tenantId}:{vendorId}:{purchaseOrderId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "vendorBlacklistedCancelPurchaseOrders",
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    name: "payment-processed-invoice-apply",
    description:
      "PaymentProcessed → Invoice.applyPayment (guard-safe: skip DRAFT/overpay)",
    category: "finance",
    triggeringEvents: ["PaymentProcessed"],
    triggeringEntity: "Payment",
    triggeringCommand: "process",
    hook: "after-emit",
    targetEntity: "Invoice",
    targetCommand: "applyPayment",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "payment-invoice:{tenantId}:{paymentId}:apply",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "paymentProcessedInvoiceApply",
  },
  {
    name: "payment-refunded-invoice-record",
    description:
      "PaymentRefunded → Invoice.recordRefund (load payment for invoiceId)",
    category: "finance",
    triggeringEvents: ["PaymentRefunded", "PaymentPartiallyRefunded"],
    triggeringEntity: "Payment",
    hook: "after-emit",
    targetEntity: "Invoice",
    targetCommand: "recordRefund",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "payment-refund:{tenantId}:{paymentId}:record",
    },
    executionMode: "sync",
  },
  {
    name: "collection-payment-recorded-invoice-apply",
    description:
      "CollectionPaymentRecorded → Invoice.applyPayment (load case for invoiceId)",
    category: "finance",
    triggeringEvents: ["CollectionPaymentRecorded"],
    triggeringEntity: "CollectionCase",
    hook: "after-emit",
    targetEntity: "Invoice",
    targetCommand: "applyPayment",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "collection-invoice:{tenantId}:{collectionCaseId}:apply",
    },
    executionMode: "sync",
  },
  {
    name: "collection-written-off-invoice-write-off",
    description:
      "CollectionWrittenOff → Invoice.writeOff (load case for invoiceId + amount)",
    category: "finance",
    triggeringEvents: ["CollectionWrittenOff"],
    triggeringEntity: "CollectionCase",
    hook: "after-emit",
    targetEntity: "Invoice",
    targetCommand: "writeOff",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "collection-writeoff:{tenantId}:{collectionCaseId}",
    },
    executionMode: "sync",
  },
  {
    name: "payment-plan-completed-collection-case-resolve",
    description:
      "PaymentPlanCompleted → CollectionCase.markResolved (close dunning loop)",
    category: "finance",
    triggeringEvents: ["PaymentPlanCompleted"],
    triggeringEntity: "CollectionPaymentPlan",
    hook: "after-emit",
    targetEntity: "CollectionCase",
    targetCommand: "markResolved",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "payment-plan-resolve:{tenantId}:{collectionCaseId}",
    },
    executionMode: "sync",
  },
  {
    name: "invoice-overdue-collection-case-create",
    description:
      "InvoiceMarkedOverdue → CollectionCase.create (open AR-recovery case)",
    category: "finance",
    triggeringEvents: ["InvoiceMarkedOverdue"],
    triggeringEntity: "Invoice",
    hook: "after-emit",
    targetEntity: "CollectionCase",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "invoice-overdue-case:{tenantId}:{invoiceId}",
    },
    executionMode: "sync",
  },
  {
    name: "invoice-fully-paid-mark-paid",
    description:
      "PaymentApplied (from applyPayment) → Invoice.markAsPaid when amountDue ≤ 0",
    category: "finance",
    triggeringEvents: ["PaymentApplied"],
    triggeringEntity: "Invoice",
    triggeringCommand: "applyPayment",
    hook: "after-emit",
    targetEntity: "Invoice",
    targetCommand: "markAsPaid",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "invoice-mark-paid:{tenantId}:{invoiceId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "invoiceFullyPaidMarkPaid",
  },
  {
    name: "invoice-written-off-revrec-cancel",
    description:
      "InvoiceWrittenOff → RevenueRecognitionSchedule.cancel per active schedule",
    category: "finance",
    triggeringEvents: ["InvoiceWrittenOff"],
    triggeringEntity: "Invoice",
    hook: "after-emit",
    targetEntity: "RevenueRecognitionSchedule",
    targetCommand: "cancel",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "revrec-cancel:{tenantId}:{scheduleId}",
      perTarget: true,
    },
    executionMode: "sync",
  },
  {
    name: "labor-budget-actual-recorded-alert",
    description:
      "LaborBudgetActualRecorded → BudgetAlert.create when over target",
    category: "finance",
    triggeringEvents: ["LaborBudgetActualRecorded"],
    triggeringEntity: "LaborBudget",
    hook: "after-emit",
    targetEntity: "BudgetAlert",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "labor-budget-alert:{tenantId}:{laborBudgetId}",
    },
    executionMode: "sync",
  },

  // ── CRM ───────────────────────────────────────────────────────────────────
  {
    name: "lead-converted-deal-create",
    description:
      "LeadConvertedToClient → Deal.create (load lead for title/value)",
    category: "crm",
    triggeringEvents: ["LeadConvertedToClient"],
    triggeringEntity: "Lead",
    hook: "after-emit",
    targetEntity: "Deal",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "lead-deal:{tenantId}:{leadId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "leadConvertedDealCreate",
  },
  {
    name: "proposal-lifecycle-lead-status",
    description:
      "ProposalCreated/Sent/Accepted/Rejected → Lead.status mirror (FSM-aware)",
    category: "crm",
    triggeringEvents: [
      "ProposalCreated",
      "ProposalSent",
      "ProposalAccepted",
      "ProposalRejected",
    ],
    triggeringEntity: "Proposal",
    hook: "after-emit",
    targetEntity: "Lead",
    targetCommand: "update",
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "proposal-line-item-count",
    description:
      "ProposalLineItemCreated/Removed → Proposal.increment/decrementLineItemCount",
    category: "crm",
    triggeringEvents: ["ProposalLineItemCreated", "ProposalLineItemRemoved"],
    triggeringEntity: "ProposalLineItem",
    hook: "after-emit",
    targetEntity: "Proposal",
    targetCommand: ["incrementLineItemCount", "decrementLineItemCount"],
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "deal-lifecycle-propagation",
    description:
      "DealClosed → Lead.status mirror + DealAssigned → Notification.create",
    category: "crm",
    triggeringEvents: ["DealClosed", "DealAssigned"],
    triggeringEntity: "Deal",
    hook: "after-emit",
    targetEntity: "Lead/Notification",
    targetCommand: ["update", "create"],
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "client-interaction-overdue-notify",
    description:
      "ClientInteractionMarkedOverdue → Notification.create for the assignee",
    category: "crm",
    triggeringEvents: ["ClientInteractionMarkedOverdue"],
    triggeringEntity: "ClientInteraction",
    hook: "after-emit",
    targetEntity: "Notification",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "ci-overdue-notify:{tenantId}:{clientInteractionId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "clientInteractionOverdueNotify",
  },
  {
    name: "client-interaction-escalated-notify",
    description:
      "ClientInteractionEscalated → Notification.create for the escalation target",
    category: "crm",
    triggeringEvents: ["ClientInteractionEscalated"],
    triggeringEntity: "ClientInteraction",
    hook: "after-emit",
    targetEntity: "Notification",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "ci-escalated-notify:{tenantId}:{clientInteractionId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "clientInteractionEscalatedNotify",
  },

  // ── Equipment / Facilities ────────────────────────────────────────────────
  {
    name: "maintenance-completed-equipment-record",
    description: "MaintenanceWorkOrderCompleted → Equipment.recordMaintenance",
    category: "equipment",
    triggeringEvents: ["MaintenanceWorkOrderCompleted"],
    triggeringEntity: "MaintenanceWorkOrder",
    hook: "after-emit",
    targetEntity: "Equipment",
    targetCommand: "recordMaintenance",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "maint-record:{tenantId}:{workOrderId}",
    },
    executionMode: "sync",
  },
  {
    name: "maintenance-created-equipment-status",
    description:
      "MaintenanceWorkOrderCreated → Equipment.updateStatus('maintenance')",
    category: "equipment",
    triggeringEvents: ["MaintenanceWorkOrderCreated"],
    triggeringEntity: "MaintenanceWorkOrder",
    hook: "after-emit",
    targetEntity: "Equipment",
    targetCommand: "updateStatus",
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "maintenance-schedule-completed-work-order-create",
    description:
      "MaintenanceScheduleCompleted → MaintenanceWorkOrder.create (recurrence loop)",
    category: "equipment",
    triggeringEvents: ["MaintenanceScheduleCompleted"],
    triggeringEntity: "PreventiveMaintenanceSchedule",
    hook: "after-emit",
    targetEntity: "MaintenanceWorkOrder",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "pm-work-order:{tenantId}:{equipmentId}:{dueDate}",
    },
    executionMode: "sync",
  },
  {
    name: "facility-work-order-asset-status",
    description:
      "FacilityWorkOrder lifecycle → FacilityAsset maintenance status (two legs)",
    category: "facilities",
    triggeringEvents: [
      "FacilityWorkOrderCreated",
      "FacilityWorkOrderCompleted",
    ],
    triggeringEntity: "FacilityWorkOrder",
    hook: "after-emit",
    targetEntity: "FacilityAsset",
    targetCommand: ["sendToMaintenance", "returnFromMaintenance"],
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },

  // ── Logistics ─────────────────────────────────────────────────────────────
  {
    name: "logistics-dispatch-driver-vehicle-status",
    description:
      "LogisticsDispatch lifecycle → Driver/Vehicle status (assigned/delivered/failed)",
    category: "logistics",
    triggeringEvents: [
      "LogisticsDispatchAssigned",
      "LogisticsDispatchDelivered",
      "LogisticsDispatchFailed",
    ],
    triggeringEntity: "LogisticsDispatch",
    hook: "after-emit",
    targetEntity: "Driver/Vehicle",
    targetCommand: ["setOnRoute", "setAvailable", "setInUse"],
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "logistics-route-driver-vehicle-status",
    description:
      "LogisticsRoute lifecycle → Driver/Vehicle status (started/completed/cancelled)",
    category: "logistics",
    triggeringEvents: [
      "LogisticsRouteStarted",
      "LogisticsRouteCompleted",
      "LogisticsRouteCancelled",
    ],
    triggeringEntity: "LogisticsRoute",
    hook: "after-emit",
    targetEntity: "Driver/Vehicle",
    targetCommand: ["setOnRoute", "setAvailable", "setInUse"],
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },

  // ── Staffing ──────────────────────────────────────────────────────────────
  {
    name: "schedule-published-notify-staff",
    description:
      "SchedulePublished → Notification.create per distinct shift employee",
    category: "staffing",
    triggeringEvents: ["SchedulePublished"],
    triggeringEntity: "Schedule",
    hook: "after-emit",
    targetEntity: "Notification",
    targetCommand: "create",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "schedule-notify:{tenantId}:{scheduleId}:{employeeId}",
      perTarget: true,
    },
    executionMode: "sync",
  },
  {
    name: "time-off-approved-shift-cleanup",
    description:
      "TimeOffRequestApproved → remove conflicting ScheduleShift rows",
    category: "staffing",
    triggeringEvents: ["TimeOffRequestApproved"],
    triggeringEntity: "TimeOffRequest",
    hook: "after-emit",
    targetEntity: "ScheduleShift",
    targetCommand: "remove",
    inputMapping: "1:N-fan-out",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "staff-member-deactivated-unassign-event-staff",
    description:
      "StaffMemberDeactivated → EventStaff.unassign per open assignment",
    category: "staffing",
    triggeringEvents: ["StaffMemberDeactivated"],
    triggeringEntity: "StaffMember",
    hook: "after-emit",
    targetEntity: "EventStaff",
    targetCommand: "unassign",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "staff-deactivate:{tenantId}:{staffMemberId}:{eventStaffId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "staffMemberDeactivatedUnassignEventStaff",
  },
  {
    name: "open-shift-claimed-create-schedule-shift",
    description:
      "OpenShiftClaimed → ScheduleShift.create (load shift + parent schedule)",
    category: "staffing",
    triggeringEvents: ["OpenShiftClaimed"],
    triggeringEntity: "OpenShift",
    hook: "after-emit",
    targetEntity: "ScheduleShift",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "open-shift-claim:{tenantId}:{openShiftId}",
    },
    executionMode: "sync",
  },
  {
    name: "schedule-shift-count",
    description:
      "ScheduleShiftCreated/Removed → Schedule.syncShiftCount (recompute)",
    category: "staffing",
    triggeringEvents: ["ScheduleShiftCreated", "ScheduleShiftRemoved"],
    triggeringEntity: "ScheduleShift",
    hook: "after-emit",
    targetEntity: "Schedule",
    targetCommand: "syncShiftCount",
    inputMapping: "recompute",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },
  {
    name: "schedule-shift-first-shift-due-date",
    description:
      "ScheduleShiftCreated → TrainingAssignment.applyFirstShiftDueDate (first shift only)",
    category: "staffing",
    triggeringEvents: ["ScheduleShiftCreated"],
    triggeringEntity: "ScheduleShift",
    hook: "after-emit",
    targetEntity: "TrainingAssignment",
    targetCommand: "applyFirstShiftDueDate",
    inputMapping: "load-and-derive",
    idempotencyKey: { none: true },
    executionMode: "sync",
  },

  // ── Training ──────────────────────────────────────────────────────────────
  {
    name: "training-attempt-submitted-record",
    description:
      "TrainingAttemptSubmitted → TrainingAttempt.create (derive passed from threshold)",
    category: "training",
    triggeringEvents: ["TrainingAttemptSubmitted"],
    triggeringEntity: "TrainingAssignment",
    hook: "after-emit",
    targetEntity: "TrainingAttempt",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "training-attempt:{tenantId}:{assignmentId}:{attemptId}",
    },
    executionMode: "sync",
  },
  {
    name: "staff-member-created-training-assignment",
    description:
      "StaffMemberCreated → TrainingAssignment.create (SEL onboarding assignment)",
    category: "training",
    triggeringEvents: ["StaffMemberCreated"],
    triggeringEntity: "StaffMember",
    hook: "after-emit",
    targetEntity: "TrainingAssignment",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "staff-training-assign:{tenantId}:{staffMemberId}:{moduleId}",
    },
    executionMode: "sync",
  },

  // ── Compliance ────────────────────────────────────────────────────────────
  {
    name: "employee-certification-lapsed-notify",
    description:
      "EmployeeCertificationExpired/Revoked → Notification.create for the employee",
    category: "compliance",
    triggeringEvents: [
      "EmployeeCertificationExpired",
      "EmployeeCertificationRevoked",
    ],
    triggeringEntity: "EmployeeCertification",
    hook: "after-emit",
    targetEntity: "Notification",
    targetCommand: "create",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "cert-lapsed-notify:{tenantId}:{employeeCertificationId}",
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "employeeCertificationLapsedNotify",
  },
  {
    name: "employee-certification-lapsed-suspend-availability",
    description:
      "EmployeeCertificationExpired/Revoked → suspend EmployeeAvailability rows",
    category: "compliance",
    triggeringEvents: [
      "EmployeeCertificationExpired",
      "EmployeeCertificationRevoked",
    ],
    triggeringEntity: "EmployeeCertification",
    hook: "after-emit",
    targetEntity: "EmployeeAvailability",
    targetCommand: "suspend",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template:
        "cert-suspend:{tenantId}:{employeeCertificationId}:{availabilityId}",
      perTarget: true,
    },
    executionMode: "sync",
  },

  // ── Payroll ───────────────────────────────────────────────────────────────
  {
    name: "timecard-edit-approved-time-entry-apply",
    description:
      "TimecardEditApproved → TimeEntry.applyEdit (write corrected clock times)",
    category: "payroll",
    triggeringEvents: ["TimecardEditApproved"],
    triggeringEntity: "TimecardEditRequest",
    hook: "after-emit",
    targetEntity: "TimeEntry",
    targetCommand: "applyEdit",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "timecard-apply:{tenantId}:{timecardEditRequestId}",
    },
    executionMode: "sync",
  },
  {
    name: "payroll-run-paid-period-lock",
    description:
      "PayrollRunPaid → PayrollPeriod.lock (load run for payrollPeriodId)",
    category: "payroll",
    triggeringEvents: ["PayrollRunPaid"],
    triggeringEntity: "PayrollRun",
    hook: "after-emit",
    targetEntity: "PayrollPeriod",
    targetCommand: "lock",
    inputMapping: "load-and-derive",
    idempotencyKey: {
      template: "payroll-period-lock:{tenantId}:{payrollPeriodId}",
    },
    executionMode: "sync",
  },
  {
    name: "payroll-run-paid-cascade",
    description:
      "PayrollRunPaid → close TipPool(s) + notify employees (two independent legs)",
    category: "payroll",
    triggeringEvents: ["PayrollRunPaid"],
    triggeringEntity: "PayrollRun",
    hook: "after-emit",
    targetEntity: "TipPool/Notification",
    targetCommand: ["close", "create"],
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "payroll-cascade:{tenantId}:{payrollRunId}:{targetId}",
      perTarget: true,
    },
    executionMode: "sync",
  },

  // ── Integrations ──────────────────────────────────────────────────────────
  {
    name: "email-template-deleted-deactivate-workflows",
    description:
      "EmailTemplateDeleted → EmailWorkflow.setActive(false) per dependent workflow",
    category: "integrations",
    triggeringEvents: ["EmailTemplateDeleted"],
    triggeringEntity: "EmailTemplate",
    hook: "after-emit",
    targetEntity: "EmailWorkflow",
    targetCommand: "setActive",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "email-wf-deactivate:{tenantId}:{emailTemplateId}:{workflowId}",
      perTarget: true,
    },
    executionMode: "async",
    retryPolicy: DEFAULT_REGISTRY_RETRY_POLICY,
    asyncReactionName: "emailTemplateDeletedDeactivateWorkflows",
  },
  {
    name: "email-template-deleted-sms-rule-deactivate",
    description:
      "EmailTemplateDeleted → SmsAutomationRule.deactivate per dependent rule",
    category: "integrations",
    triggeringEvents: ["EmailTemplateDeleted"],
    triggeringEntity: "EmailTemplate",
    hook: "after-emit",
    targetEntity: "SmsAutomationRule",
    targetCommand: "deactivate",
    inputMapping: "1:N-fan-out",
    idempotencyKey: {
      template: "sms-rule-deactivate:{tenantId}:{emailTemplateId}:{ruleId}",
      perTarget: true,
    },
    executionMode: "sync",
  },
] as const;

// ---------------------------------------------------------------------------
// Query / audit API
// ---------------------------------------------------------------------------

/** Frozen snapshot of the registry (defensive copy). */
export function getMiddlewareRegistry(): readonly MiddlewareRegistryEntry[] {
  return MIDDLEWARE_REGISTRY;
}

/** Look up a single entry by name. */
export function getRegistryEntry(
  name: string
): MiddlewareRegistryEntry | undefined {
  return MIDDLEWARE_REGISTRY.find((entry) => entry.name === name);
}

/**
 * Find every reaction triggered by a given semantic event name.
 *
 * Answers "what does `PaymentProcessed` trigger?" — the core audit query.
 */
export function findReactionsTriggeredByEvent(
  eventName: string
): readonly MiddlewareRegistryEntry[] {
  return MIDDLEWARE_REGISTRY.filter((entry) =>
    entry.triggeringEvents.includes(eventName)
  );
}

/**
 * Find every reaction whose target involves a given entity (substring match on
 * `targetEntity`, since multi-leg targets are slash-joined).
 *
 * Answers "what mutations hit `Invoice`?".
 */
export function findReactionsTargetingEntity(
  entityName: string
): readonly MiddlewareRegistryEntry[] {
  return MIDDLEWARE_REGISTRY.filter((entry) =>
    entry.targetEntity.includes(entityName)
  );
}

/** All entries opted into the async durable queue. */
export function getAsyncRegistryEntries(): readonly MiddlewareRegistryEntry[] {
  return MIDDLEWARE_REGISTRY.filter((entry) => entry.executionMode === "async");
}

/** All entries that use the two-hook before-guard state-capture pattern. */
export function getTwoHookRegistryEntries(): readonly MiddlewareRegistryEntry[] {
  return MIDDLEWARE_REGISTRY.filter((entry) => entry.hook === "two-hook");
}

/** All entries grouped by category (for dashboards / reports). */
export function getRegistryByCategory(): ReadonlyMap<
  MiddlewareCategory,
  readonly MiddlewareRegistryEntry[]
> {
  const map = new Map<MiddlewareCategory, MiddlewareRegistryEntry[]>();
  for (const entry of MIDDLEWARE_REGISTRY) {
    const bucket = map.get(entry.category) ?? [];
    bucket.push(entry);
    map.set(entry.category, bucket);
  }
  return map;
}

/**
 * Validate that the set of middleware NAMES wired in the factory matches the
 * registry. Returns the drift (entries wired but not declared, and entries
 * declared but not wired).
 *
 * Call this from the factory at boot (warn-only) so a new middleware added to
 * the pipeline without a registry entry — or a registry entry never wired — is
 * surfaced immediately. This is the "prevent duplicate / missing wiring" guard
 * the feature rationale calls for.
 */
export function diffRegistryVsWiring(wiredNames: readonly string[]): {
  wiredButNotDeclared: string[];
  declaredButNotWired: string[];
} {
  const wired = new Set(wiredNames);
  const declared = new Set(MIDDLEWARE_REGISTRY.map((e) => e.name));
  const wiredButNotDeclared = [...wired].filter((n) => !declared.has(n)).sort();
  const declaredButNotWired = [...declared].filter((n) => !wired.has(n)).sort();
  return { wiredButNotDeclared, declaredButNotWired };
}

/**
 * Assert the registry's internal integrity. Called by tests.
 *
 * Checks:
 * - unique names (no duplicate wiring — the duplicate-execution bug class)
 * - every async entry declares a reaction name
 * - every async entry declares a retry policy (or falls back to the default)
 * - no two-hook entry is async (async breaks state-capture)
 * - triggering-event entries are non-empty unless cross-cutting infra
 */
export function assertRegistryIntegrity(): void {
  const seen = new Set<string>();
  for (const entry of MIDDLEWARE_REGISTRY) {
    if (seen.has(entry.name)) {
      throw new Error(
        `[middleware-registry] duplicate name: "${entry.name}" (duplicate-execution risk)`
      );
    }
    seen.add(entry.name);

    if (entry.executionMode === "async") {
      if (!entry.asyncReactionName) {
        throw new Error(
          `[middleware-registry] async entry "${entry.name}" missing asyncReactionName`
        );
      }
      if (!entry.retryPolicy) {
        throw new Error(
          `[middleware-registry] async entry "${entry.name}" missing retryPolicy`
        );
      }
    }

    if (entry.hook === "two-hook" && entry.executionMode === "async") {
      throw new Error(
        `[middleware-registry] two-hook entry "${entry.name}" cannot be async (state-capture contract)`
      );
    }

    if (
      entry.triggeringEvents.length === 0 &&
      entry.category !== "cross-cutting"
    ) {
      throw new Error(
        `[middleware-registry] entry "${entry.name}" declares no triggeringEvents`
      );
    }
  }
}
