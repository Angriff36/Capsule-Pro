/**
 * Shipment receiving → InventoryItem restock middleware.
 *
 * Runs inside the Manifest runtime lifecycle after a `ShipmentItem.updateReceived`
 * command emits `ShipmentItemReceived`. Confirming a received shipment line is
 * supposed to add the received quantity to the linked inventory item, but the old
 * `on ShipmentItemReceived run InventoryItem.restock` reaction was a SILENT NO-OP:
 * it resolved `payload.result.itemId`, and `updateReceived` is a MUTATE command, so
 * the engine's emitted payload `{ ...commandInput, result }` carries `result` = the
 * last mutate's scalar (`conditionNotes`), NOT the ShipmentItem instance. So received
 * shipments never restocked inventory — stock-on-hand silently diverged from reality
 * at every delivery, and the manual receiving workflows the reaction was meant to
 * replace stayed load-bearing.
 *
 * WHY middleware and not a reaction (the crux — matches the verified engine-semantics
 * correction in IMPLEMENTATION_PLAN P0): the values `restock` needs are the
 * ShipmentItem's OWN fields, not `updateReceived` params:
 *   - `itemId` (which inventory item to restock) is `ShipmentItem.itemId`, declared on
 *     the entity but NOT an `updateReceived` param — declared event fields are never
 *     auto-populated from `self.*`, so no reaction (even reading `payload.*`) can see it.
 *   - `costPerUnit` must be the ShipmentItem's real `unitCost`. The dead reaction
 *     hardcoded `costPerUnit: 0`, which — once the no-op was "fixed" naively — would
 *     mutate `InventoryItem.unitCost` to $0 on every receipt, corrupting valuation /
 *     FIFO. The middleware reads `self.unitCost` from the loaded ShipmentItem, and if
 *     that is missing/zero it PRESERVES the item's existing `unitCost` rather than
 *     zeroing a known cost.
 * Only `quantityReceived` and `userId` are genuine `updateReceived` params, so they
 * ride the payload; everything else is loaded from the store.
 *
 * Receiving a line is a one-shot stock movement, so the idempotency key is per
 * ShipmentItem — re-dispatching `restock` for the same received line would double-count
 * stock (a bug, unlike the append-only inventory ledger where per-row keys are correct).
 * Every skip path reports through `onDiagnostic` instead of silently returning.
 */

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

export interface ShipmentRestockDiagnostic {
  detail?: Record<string, unknown>;
  itemId?: string;
  reason: string;
  shipmentItemId?: string;
  stage: string;
  tenantId?: string;
}

export interface ShipmentItemReceivedInventoryRestockMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: ShipmentRestockDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface ShipmentItemReceivedPayload {
  quantityReceived?: unknown;
  tenantId?: unknown;
  userId?: unknown;
}

interface ShipmentItemLike {
  itemId?: unknown;
  unitCost?: unknown;
}

interface InventoryItemLike {
  unitCost?: unknown;
}

const RECEIVE_COMMANDS = new Set(["updateReceived"]);

const defaultDiagnostic = (diag: ShipmentRestockDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[shipment-restock:${diag.stage}] ${diag.reason}`, {
    itemId: diag.itemId,
    shipmentItemId: diag.shipmentItemId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that restocks an inventory item when its shipment line is
 * received. Store/provider based so tests and production share the same Manifest
 * runtime boundary.
 */
export function createShipmentItemReceivedInventoryRestockMiddleware(
  options: ShipmentItemReceivedInventoryRestockMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine ShipmentItem.updateReceived mutation, not a look-alike
      // event from another entity/command.
      if (ctx.entityName !== "ShipmentItem") {
        return {};
      }

      const received = ctx.emittedEvents.filter(
        (event) =>
          event.name === "ShipmentItemReceived" &&
          RECEIVE_COMMANDS.has(ctx.command.name)
      );

      for (const event of received) {
        const payload = event.payload as ShipmentItemReceivedPayload | undefined;

        const shipmentItemId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(shipmentItemId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `ShipmentItemReceived missing ${
              shipmentItemId ? "tenantId" : "shipmentItemId"
            }`,
            shipmentItemId,
            tenantId,
          });
          continue;
        }

        // `restock` guards `quantity > 0`. Receiving zero is a legitimate no-op
        // (line confirmed but nothing arrived) — skip rather than dispatch a
        // swallowed guard failure.
        const quantity = asFiniteNumber(payload?.quantityReceived);
        if (!(quantity && quantity > 0)) {
          onDiagnostic({
            stage: "quantity",
            reason: "received quantity is zero/absent — nothing to restock",
            shipmentItemId,
            tenantId,
            detail: { quantityReceived: payload?.quantityReceived },
          });
          continue;
        }

        const shipmentItemStore = storeProvider("ShipmentItem");
        const inventoryItemStore = storeProvider("InventoryItem");
        if (!(shipmentItemStore && inventoryItemStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "ShipmentItem/InventoryItem store unavailable",
            shipmentItemId,
            tenantId,
          });
          continue;
        }

        const shipmentItem = (await shipmentItemStore.getById(
          shipmentItemId
        )) as ShipmentItemLike | undefined;
        if (!shipmentItem) {
          onDiagnostic({
            stage: "load",
            reason: "ShipmentItem not found in store",
            shipmentItemId,
            tenantId,
          });
          continue;
        }

        // itemId is the ShipmentItem's OWN field — the whole reason this is
        // middleware, not a reaction.
        const itemId = asNonEmptyString(shipmentItem.itemId);
        if (!itemId) {
          onDiagnostic({
            stage: "itemId",
            reason: "ShipmentItem carries no itemId — cannot restock",
            shipmentItemId,
            tenantId,
          });
          continue;
        }

        const inventoryItem = (await inventoryItemStore.getById(itemId)) as
          | InventoryItemLike
          | undefined;
        if (!inventoryItem) {
          onDiagnostic({
            stage: "item-load",
            reason: "linked InventoryItem not found — cannot restock",
            shipmentItemId,
            itemId,
            tenantId,
          });
          continue;
        }

        // costPerUnit: use the ShipmentItem's real unitCost so the receipt is
        // correctly valued. If the shipment line has no cost (0/missing), PRESERVE
        // the item's existing unitCost rather than zeroing a known cost — `restock`
        // unconditionally `mutate unitCost = costPerUnit`, so a hardcoded 0 (the old
        // reaction's bug) would corrupt valuation on every receipt.
        const shipmentUnitCost = asFiniteNumber(shipmentItem.unitCost) ?? 0;
        const existingUnitCost = asFiniteNumber(inventoryItem.unitCost) ?? 0;
        const costPerUnit =
          shipmentUnitCost > 0 ? shipmentUnitCost : existingUnitCost;

        const userId = asNonEmptyString(payload?.userId) ?? "system";

        const result = await dispatchCommand(
          "restock",
          {
            // restock is a MUTATE on an existing item — the id travels in the body
            // AND as instanceId (mutate-dispatch contract).
            id: itemId,
            tenantId,
            quantity,
            costPerUnit,
            userId,
          },
          {
            entityName: "InventoryItem",
            instanceId: itemId,
            correlationId: shipmentItemId,
            causationId: "ShipmentItemReceived",
            // Per received line — re-receiving the same line must not double-count
            // stock. (Effective once dispatcher idempotency is enabled; inert but
            // harmless today.)
            idempotencyKey: `shipment-restock:${tenantId}:${shipmentItemId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "restock",
            reason: `InventoryItem.restock failed: ${result.error ?? "unknown"}`,
            shipmentItemId,
            itemId,
            tenantId,
            detail: { quantity, costPerUnit },
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `restocked ${quantity} @ ${costPerUnit}`,
          shipmentItemId,
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
