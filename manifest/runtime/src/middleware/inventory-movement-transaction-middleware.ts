/**
 * Inventory-movement → InventoryTransaction ledger middleware.
 *
 * Runs inside the Manifest runtime lifecycle after an `InventoryItem` movement
 * command emits its event (`consume → InventoryConsumed`, `waste →
 * InventoryWasted`, `restock → InventoryRestocked`, `adjust →
 * InventoryAdjusted`). Each movement mutates the item's quantities but NOTHING
 * recorded the movement in the governed `InventoryTransaction` ledger — that
 * append-only ledger was only ever written by direct Prisma in three routes
 * (purchase-orders complete, stock-levels adjust, cycle-count finalize). So the
 * governed stock ledger was structurally defined but effectively EMPTY for the
 * day-to-day kitchen movements, leaving valuation, par/reorder math, and audit
 * (constitution §12) without a movement trail. This closes that gap: on each
 * movement event it dispatches a governed `InventoryTransaction.create`.
 *
 * WHY middleware and not a reaction (the crux):
 * `InventoryTransaction.create` needs a `unitCost` for valuation, but for
 * consume/waste/adjust the cost is the InventoryItem's OWN field
 * (`self.unitCost`) — NOT a movement command param — and declared event fields
 * are never auto-populated from `self.*`, so a reaction's payload cannot carry
 * it. The middleware loads the item from the store to read `unitCost`. It also
 * needs the SIGNED ledger delta: consume/waste subtract a positive magnitude
 * (ledger `-quantity`), restock adds (`+quantity`), and adjust's param is
 * already a signed delta (`+quantity`). A reaction cannot negate the param.
 *
 * Each movement is a distinct, real ledger row (the ledger is append-only and
 * stock = SUM(quantity)); there is no semantic dedup key, so the idempotency
 * key is per-row — duplicate-suppression here would be a bug, not a feature.
 * Every skip path reports through `onDiagnostic` instead of silently returning.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface InventoryLedgerDiagnostic {
  detail?: Record<string, unknown>;
  eventName?: string;
  itemId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface InventoryMovementTransactionMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: InventoryLedgerDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface MovementSpec {
  /** Must be a member of InventoryTransaction.validTransactionType. */
  transactionType: string;
  /**
   * Multiplier applied to the movement command's `quantity` param to produce the
   * SIGNED ledger delta. consume/waste subtract a positive magnitude (−1);
   * restock adds (+1); adjust's param is already a signed delta (+1 passthrough).
   */
  sign: 1 | -1;
  /** restock carries `costPerUnit` in its payload; others load item.unitCost. */
  costFromPayload: boolean;
}

/**
 * Each inventory-movement event → its ledger transaction shape. transactionType
 * values are the InventoryTransaction enum members (NOT the command names) — so
 * the entity's `validTransactionType` block constraint passes at create.
 */
const MOVEMENT_SPECS: Record<string, MovementSpec> = {
  InventoryConsumed: {
    transactionType: "issue",
    sign: -1,
    costFromPayload: false,
  },
  InventoryWasted: { transactionType: "waste", sign: -1, costFromPayload: false },
  InventoryRestocked: {
    transactionType: "receipt",
    sign: 1,
    costFromPayload: true,
  },
  InventoryAdjusted: {
    transactionType: "adjustment",
    sign: 1,
    costFromPayload: false,
  },
};

interface MovementPayload {
  costPerUnit?: unknown;
  lotId?: unknown;
  quantity?: unknown;
  reason?: unknown;
  tenantId?: unknown;
  userId?: unknown;
}

interface InventoryItemLike {
  unitCost?: unknown;
}

const defaultDiagnostic = (diag: InventoryLedgerDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[inv-ledger:${diag.stage}] ${diag.reason}`, {
    eventName: diag.eventName,
    itemId: diag.itemId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that records an InventoryTransaction ledger row for every
 * governed InventoryItem movement. Store/provider based so tests and production
 * share the same Manifest runtime boundary.
 */
export function createInventoryMovementTransactionMiddleware(
  options: InventoryMovementTransactionMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Only the InventoryItem movement commands are ledgered. Filtering on the
      // command's entity (not just the event name) keeps the ledger anchored to a
      // genuine InventoryItem mutation and ignores any look-alike event.
      if (ctx.entityName !== "InventoryItem") {
        return {};
      }

      const movements = ctx.emittedEvents.filter(
        (event) => MOVEMENT_SPECS[event.name] !== undefined
      );

      for (const event of movements) {
        const spec = MOVEMENT_SPECS[event.name];
        const payload = event.payload as MovementPayload | undefined;

        const itemId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(itemId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `${event.name} missing ${itemId ? "tenantId" : "itemId"}`,
            eventName: event.name,
            itemId,
            tenantId,
          });
          continue;
        }

        const magnitude = asFiniteNumber(payload?.quantity);
        if (magnitude === undefined) {
          onDiagnostic({
            stage: "resolve",
            reason: `${event.name} carried no numeric quantity`,
            eventName: event.name,
            itemId,
            tenantId,
          });
          continue;
        }

        const ledgerQuantity = spec.sign * magnitude;
        if (ledgerQuantity === 0) {
          // InventoryTransaction.create guards quantity != 0 (and the entity's
          // nonZeroQuantity block) — a zero-delta movement is a no-op ledger row.
          onDiagnostic({
            stage: "skip",
            reason: `${event.name} resolved to a zero ledger delta — skipped`,
            eventName: event.name,
            itemId,
            tenantId,
          });
          continue;
        }

        // unitCost: restock carries costPerUnit in its payload; for the others
        // load the item's own unitCost so the ledger row is correctly valued.
        let unitCost = 0;
        if (spec.costFromPayload) {
          unitCost = asFiniteNumber(payload?.costPerUnit) ?? 0;
        } else {
          const itemStore = storeProvider("InventoryItem");
          const item = itemStore
            ? ((await itemStore.getById(itemId)) as
                | InventoryItemLike
                | undefined)
            : undefined;
          unitCost = asFiniteNumber(item?.unitCost) ?? 0;
        }

        const lotId = asNonEmptyString(payload?.lotId);
        const transactionId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId —
            // passing instanceId targets an existing instance and the row is
            // never persisted (mirrors lead-deal / prep-list-seed creates).
            id: transactionId,
            tenantId,
            itemId,
            transactionType: spec.transactionType,
            quantity: ledgerQuantity,
            unitCost,
            referenceType: lotId ? "lot" : "",
            referenceId: lotId ?? "",
            reason: asNonEmptyString(payload?.reason) ?? "",
            notes: "",
            employeeId: asNonEmptyString(payload?.userId) ?? "",
            storageLocationId: "",
          },
          {
            entityName: "InventoryTransaction",
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? itemId,
            causationId: event.name,
            idempotencyKey: `inv-tx:${tenantId}:${itemId}:${transactionId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `InventoryTransaction.create failed: ${result.error ?? "unknown"}`,
            eventName: event.name,
            itemId,
            tenantId,
            detail: { transactionType: spec.transactionType, ledgerQuantity },
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `ledger row recorded (${spec.transactionType} ${ledgerQuantity})`,
          eventName: event.name,
          itemId,
          tenantId,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // money/decimal fields may surface as strings from the store/payload.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
