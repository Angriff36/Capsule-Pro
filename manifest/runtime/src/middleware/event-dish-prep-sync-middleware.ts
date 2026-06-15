/**
 * EventDishCreated / EventDishQuantityUpdated → PrepList & PrepListItem sync.
 *
 * Implements the Event-lifecycle propagation "when an event's menu changes,
 * keep its prep list in step" (IMPLEMENTATION_PLAN P1, Event lifecycle →
 * "EventDishCreated/QuantityUpdated/Removed → PrepList & inventory").
 *
 * THE BUG it fixes: the prep list is derived ONCE, at seed time, from the
 * event's dishes (`prep-list-seed-middleware` on the `EventConfirmed run
 * PrepList.create` shell). `EventDishCreated` (a dish added AFTER the seed) and
 * `EventDishQuantityUpdated` (a serving-count change) have NO consumer — so a
 * dish added to a confirmed event never appears in the kitchen's prep list, and
 * bumping a dish's servings never re-scales its ingredient demand. A silent
 * food-quantity / missing-mise-en-place defect.
 *
 * WHY middleware and not a reaction (the same two blockers as the sibling
 * guest-count rescale, plus a third):
 *   1. 1:N fan-out — one EventDish change touches many PrepLists, each with many
 *      PrepListItems; a declarative `on EventDishCreated run …` reaction resolves
 *      exactly ONE target instance and cannot reach the set.
 *   2. The demand is DERIVED, not carried — the new ingredient rows come from a
 *      cross-store walk (EventDish → Dish → RecipeVersion → RecipeIngredient →
 *      Ingredient → InventoryItem) the DSL cannot express.
 *   3. `EventDishQuantityUpdated` carries only `quantityServings` (the lone
 *      `updateQuantity` param); the event's `eventId` is the EventDish's OWN
 *      field, never auto-populated onto the payload — so the dish must be LOADED.
 *
 * HOW it stays correct under cross-dish aggregation: the seed AGGREGATES
 * ingredients across all of an event's dishes by inventory-item id (a shared
 * ingredient sums its contributions; only the first dish's id is recorded on the
 * row). A naive per-dish incremental add would double-count or mis-attribute.
 * Instead this middleware RE-DERIVES the full line set from the event's CURRENT
 * dishes (the authoritative post-mutation state — so no old/new ratio is needed)
 * via the shared `deriveSeedLines`, then RECONCILES it against the existing
 * `PrepListItem` rows per draft list:
 *   • a derived ingredient with no matching row  → `PrepListItem.create`
 *   • a derived ingredient whose quantity changed → `PrepListItem.updateQuantity`
 *   • an unchanged ingredient                     → no-op (no spurious event)
 *
 * PRESERVES the guest-count rescale: a draft list's `batchMultiplier` is the
 * guest-driven scaling knob, and the sibling guest middleware maintains the
 * invariant `scaledQuantity = derivedScaled × batchMultiplier`. So the reconcile
 * target is `derivedScaled × currentBatchMultiplier` — NOT the raw seed scale —
 * otherwise adding a dish to a guest-rescaled list would silently wipe the
 * rescale. `baseQuantity` (the guest-independent recipe base) is set straight
 * from the derivation.
 *
 * SCOPE — draft prep lists only (mirrors the guest-count middleware): a
 * finalized/completed list is locked for kitchen execution against fixed
 * quantities; menus change during planning, while the list is still a draft. An
 * event not yet seeded (no draft list) is a clean no-op — the seed picks the
 * dish up when the event is confirmed.
 *
 * REMOVAL — `EventDishRemoved` prunes the demand a removed dish no longer
 * carries. Because the same re-derive+reconcile is used, a removed dish simply
 * drops out of the re-derived line set: an ingredient ONLY that dish demanded
 * disappears from the derivation and is pruned (`PrepListItem.remove`, a soft
 * delete), while an ingredient SHARED with a surviving dish stays in the
 * derivation at its reduced quantity and is decremented (the update path), not
 * pruned. Two subtleties drive the implementation:
 *   • Once `remove` soft-deletes the EventDish, the store filters the row out
 *     (getById/getAll exclude `deletedAt != null`) AND the `EventDishRemoved`
 *     payload does not carry `eventId` (engine payload is `{...commandInput,
 *     result}` only). So the dish's `eventId`/`tenantId` are captured on the
 *     `before-guard` hook (while `evalContext.self` is still the live row) and
 *     read back on `after-emit` — the same two-hook contextPatch technique the
 *     sibling guest-count rescale uses.
 *   • Prune touches ONLY derived rows — those carrying a non-empty
 *     `recipeVersionId` (the fingerprint the seed/sync stamps on every row it
 *     creates). A hand-added row (no `recipeVersionId`) is left alone: a menu
 *     change should retract only what the menu derivation introduced.
 *
 * Every skip/failure reports through `onDiagnostic` (default console.warn) —
 * never silently.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import {
  assignStation,
  deriveSeedLines,
  type DerivationStores,
  type SeedLine,
} from "./prep-list-seed-middleware";

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

export interface EventDishPrepSyncDiagnostic {
  detail?: Record<string, unknown>;
  eventDishId?: string;
  eventId?: string;
  prepListId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventDishPrepSyncMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EventDishPrepSyncDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

/** Below this absolute delta a quantity is treated as unchanged (no update). */
const QTY_EPSILON = 1e-4;

/**
 * evalContext key carrying a removed dish's parent keys from `before-guard`
 * (live row) to `after-emit` (row already soft-deleted and store-filtered).
 */
const REMOVED_DISH_KEY = "__eventDishPrepSync_removed";

interface EventDishRow {
  deletedAt?: unknown;
  eventId?: unknown;
  id?: unknown;
  tenantId?: unknown;
}

interface PrepListRow {
  batchMultiplier?: unknown;
  eventId?: unknown;
  id?: unknown;
  isActive?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

interface PrepListItemRow {
  baseQuantity?: unknown;
  deletedAt?: unknown;
  id?: unknown;
  ingredientId?: unknown;
  prepListId?: unknown;
  recipeVersionId?: unknown;
  scaledQuantity?: unknown;
  sortOrder?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: EventDishPrepSyncDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-dish-prep-sync:${diag.stage}] ${diag.reason}`, {
    eventDishId: diag.eventDishId,
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    prepListId: diag.prepListId,
    ...diag.detail,
  });
};

export function createEventDishPrepSyncMiddleware(
  options: EventDishPrepSyncMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["before-guard", "after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Phase 1 (before-guard): a dish being removed is about to be soft-deleted.
      // Once `deletedAt` is set, the store filters the row out, and the
      // EventDishRemoved payload does not carry `eventId` — so snapshot the
      // parent keys now, while evalContext.self is still the live row.
      if (ctx.hook === "before-guard") {
        if (ctx.entityName === "EventDish" && ctx.command.name === "remove") {
          const self = ctx.evalContext.self as
            | { eventId?: unknown; id?: unknown; tenantId?: unknown }
            | undefined;
          return {
            contextPatch: {
              [REMOVED_DISH_KEY]: {
                eventDishId:
                  asNonEmptyString(self?.id) ?? asNonEmptyString(ctx.instanceId),
                eventId: asNonEmptyString(self?.eventId),
                tenantId: asNonEmptyString(self?.tenantId),
              },
            },
          };
        }
        return {};
      }

      // Only EventDish add / serving-count / removal changes are relevant.
      if (ctx.hook !== "after-emit" || ctx.entityName !== "EventDish") {
        return {};
      }
      const triggers = ctx.emittedEvents.filter(
        (event) =>
          event.name === "EventDishCreated" ||
          event.name === "EventDishQuantityUpdated" ||
          event.name === "EventDishRemoved"
      );
      if (triggers.length === 0) {
        return {};
      }

      const eventDishStore = storeProvider("EventDish");
      if (!eventDishStore) {
        onDiagnostic({
          stage: "stores",
          reason: "EventDish store unavailable — prep sync skipped",
        });
        return {};
      }

      // Resolve the distinct set of (event, tenant) to reconcile. Re-derivation
      // is full-list, so each affected event is reconciled exactly once even if
      // several of its dishes changed in the same command. `prune` is set when a
      // removal contributed — only then do we retract no-longer-demanded rows.
      const events = new Map<
        string,
        { eventId: string; prune: boolean; tenantId: string }
      >();
      for (const trigger of triggers) {
        if (trigger.name === "EventDishRemoved") {
          // The removed dish is soft-deleted (store-filtered) → use the
          // before-guard snapshot.
          const snapshot = ctx.evalContext[REMOVED_DISH_KEY] as
            | { eventDishId?: unknown; eventId?: unknown; tenantId?: unknown }
            | undefined;
          const eventId = asNonEmptyString(snapshot?.eventId);
          const tenantId =
            asNonEmptyString(snapshot?.tenantId) ??
            asNonEmptyString(
              (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
                ?.tenantId
            );
          if (!(eventId && tenantId)) {
            onDiagnostic({
              stage: "resolve",
              reason:
                "EventDishRemoved: pre-mutation eventId/tenantId snapshot missing — prune skipped",
              eventDishId:
                asNonEmptyString(snapshot?.eventDishId) ??
                asNonEmptyString(trigger.subject?.id),
              eventId,
              tenantId,
            });
            continue;
          }
          events.set(eventId, { eventId, tenantId, prune: true });
          continue;
        }

        // EventDishCreated / EventDishQuantityUpdated: the dish is still live, so
        // load it for its eventId/tenantId.
        const payload = trigger.payload as
          | { eventId?: unknown; result?: { id?: unknown; tenantId?: unknown } }
          | undefined;
        const eventDishId =
          asNonEmptyString(trigger.subject?.id) ??
          asNonEmptyString(ctx.instanceId) ??
          asNonEmptyString(payload?.result?.id);
        if (!eventDishId) {
          onDiagnostic({
            stage: "resolve",
            reason: `${trigger.name} carries no resolvable EventDish id — skipped`,
          });
          continue;
        }

        const row = (await eventDishStore.getById(eventDishId)) as
          | EventDishRow
          | undefined;
        // A dish removed in the same breath surfaces as EventDishRemoved above.
        if (row && row.deletedAt != null) {
          continue;
        }
        const eventId =
          asNonEmptyString(row?.eventId) ?? asNonEmptyString(payload?.eventId);
        const tenantId =
          asNonEmptyString(row?.tenantId) ??
          asNonEmptyString(payload?.result?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(eventId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `${trigger.name} missing ${eventId ? "tenantId" : "eventId"} — skipped`,
            eventDishId,
            eventId,
            tenantId,
          });
          continue;
        }
        const prev = events.get(eventId);
        events.set(eventId, {
          eventId,
          tenantId,
          prune: prev?.prune ?? false,
        });
      }

      for (const { eventId, tenantId, prune } of events.values()) {
        await reconcileEvent({
          eventId,
          tenantId,
          prune,
          ctx,
          storeProvider,
          dispatchCommand,
          onDiagnostic,
        });
      }

      return {};
    },
  };
}

/** Re-derive an event's full ingredient demand and reconcile its draft prep lists. */
async function reconcileEvent(args: {
  eventId: string;
  tenantId: string;
  prune: boolean;
  ctx: MiddlewareContext;
  storeProvider: (entityName: string) => Store | undefined;
  dispatchCommand: DispatchCommand;
  onDiagnostic: (diag: EventDishPrepSyncDiagnostic) => void;
}): Promise<void> {
  const {
    eventId,
    tenantId,
    prune,
    ctx,
    storeProvider,
    dispatchCommand,
    onDiagnostic,
  } = args;

  const prepListStore = storeProvider("PrepList");
  if (!prepListStore) {
    onDiagnostic({
      stage: "stores",
      reason: "PrepList store unavailable — prep sync skipped",
      eventId,
      tenantId,
    });
    return;
  }

  // Draft prep lists for this event only (finalized/completed are locked for
  // execution). An event whose prep is not yet seeded has none — clean no-op.
  const prepLists = (await prepListStore.getAll())
    .map((row) => row as PrepListRow)
    .filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.eventId) === eventId &&
        row.isActive !== false &&
        asNonEmptyString(row.status) === "draft"
    );
  if (prepLists.length === 0) {
    return;
  }

  // The derivation stores (same set the seed middleware walks).
  const stores = {
    dish: storeProvider("Dish"),
    event: storeProvider("Event"),
    eventDish: storeProvider("EventDish"),
    ingredient: storeProvider("Ingredient"),
    inventoryItem: storeProvider("InventoryItem"),
    prepListItem: storeProvider("PrepListItem"),
    recipeIngredient: storeProvider("RecipeIngredient"),
    recipeVersion: storeProvider("RecipeVersion"),
  };
  const missing = Object.entries(stores)
    .filter(([, store]) => !store)
    .map(([name]) => name);
  if (missing.length > 0) {
    onDiagnostic({
      stage: "stores",
      reason: "derivation stores unavailable — prep sync skipped",
      eventId,
      tenantId,
      detail: { missing },
    });
    return;
  }

  // Re-derive the full current ingredient demand once (event-scoped, list-agnostic).
  const lines = await deriveSeedLines({
    tenantId,
    eventId,
    prepListId: "(event-dish-sync)",
    stores: stores as Required<typeof stores> as DerivationStores,
    onDiagnostic: (d) =>
      onDiagnostic({ ...d, eventId, tenantId, prepListId: undefined }),
  });
  if (lines.length === 0 && !prune) {
    // No derivable demand and nothing to retract (add/update path). Not an error.
    return;
  }
  const derivedIds = new Set(lines.map((line) => line.ingredientId));

  const allItems = (await stores.prepListItem!.getAll()).map(
    (row) => row as PrepListItemRow
  );

  for (const prepList of prepLists) {
    const prepListId = asNonEmptyString(prepList.id);
    if (!prepListId) {
      continue;
    }
    // The guest-driven scaling knob: reconcile target = derivedScaled × bm, so a
    // dish change preserves any prior guest-count rescale on this list.
    const batchMultiplier = asPositiveNumber(prepList.batchMultiplier) ?? 1;

    const existing = new Map<string, PrepListItemRow>();
    let maxSortOrder = 0;
    for (const item of allItems) {
      if (
        asNonEmptyString(item.tenantId) !== tenantId ||
        asNonEmptyString(item.prepListId) !== prepListId
      ) {
        continue;
      }
      // A soft-deleted row is gone in production (the store filters it); skip it
      // so it is neither updated nor re-removed (the test store does not filter).
      if (item.deletedAt != null) {
        continue;
      }
      const ingredientId = asNonEmptyString(item.ingredientId);
      if (ingredientId) {
        existing.set(ingredientId, item);
      }
      maxSortOrder = Math.max(maxSortOrder, asFiniteNumber(item.sortOrder) ?? 0);
    }

    for (const line of lines) {
      const targetScaled = roundTo(line.scaledQuantity * batchMultiplier, 4);
      const current = existing.get(line.ingredientId);

      if (!current) {
        // New ingredient introduced by the added/updated dish → create the row.
        maxSortOrder += 1;
        const station = assignStation(line.category);
        const result = await dispatchCommand(
          "create",
          {
            id: randomUUID(),
            tenantId,
            prepListId,
            stationId: station.stationId,
            stationName: station.stationName,
            ingredientId: line.ingredientId,
            ingredientName: line.ingredientName,
            category: line.category,
            baseQuantity: line.baseQuantity,
            baseUnit: line.unit,
            scaledQuantity: targetScaled,
            scaledUnit: line.unit,
            isOptional: line.isOptional,
            preparationNotes: line.preparationNotes,
            allergens: line.allergens,
            dietarySubstitutions: "",
            dishId: line.dishId,
            dishName: line.dishName,
            recipeVersionId: line.recipeVersionId,
            sortOrder: maxSortOrder,
          },
          {
            entityName: "PrepListItem",
            correlationId: eventId,
            causationId: "EventDishChanged",
            idempotencyKey: `event-dish-prep:${tenantId}:${eventId}:create:${prepListId}:${line.ingredientId}`,
          }
        );
        bubble(ctx, result);
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `PrepListItem.create failed for ${line.ingredientName}: ${result.error ?? "unknown"}`,
            eventId,
            tenantId,
            prepListId,
            detail: { ingredientId: line.ingredientId },
          });
        }
        continue;
      }

      // Existing ingredient → update only when the demand actually changed
      // (cross-dish aggregation may have grown its quantity, or the dish's
      // servings changed). Unchanged rows are left alone — no spurious event.
      const currentBase = asNonNegativeNumber(current.baseQuantity) ?? 0;
      const currentScaled = asNonNegativeNumber(current.scaledQuantity) ?? 0;
      if (
        Math.abs(currentBase - line.baseQuantity) < QTY_EPSILON &&
        Math.abs(currentScaled - targetScaled) < QTY_EPSILON
      ) {
        continue;
      }
      const itemId = asNonEmptyString(current.id);
      if (!itemId) {
        continue;
      }
      const result = await dispatchCommand(
        "updateQuantity",
        {
          newBaseQuantity: line.baseQuantity,
          newScaledQuantity: targetScaled,
          newBaseUnit: line.unit,
          newScaledUnit: line.unit,
        },
        {
          entityName: "PrepListItem",
          instanceId: itemId,
          correlationId: eventId,
          causationId: "EventDishChanged",
          idempotencyKey: `event-dish-prep:${tenantId}:${eventId}:update:${prepListId}:${itemId}:${targetScaled}`,
        }
      );
      bubble(ctx, result);
      if (!result.success) {
        onDiagnostic({
          stage: "update",
          reason: `PrepListItem.updateQuantity failed for ${itemId}: ${result.error ?? "unknown"}`,
          eventId,
          tenantId,
          prepListId,
          detail: { itemId, targetScaled },
        });
      }
    }

    // Prune (removal path only): retract derived rows the menu no longer demands.
    // An ingredient still demanded by a surviving dish stays in `derivedIds` and
    // was decremented above; one only the removed dish demanded has dropped out
    // and is soft-deleted here. Only rows the seed/sync produced (non-empty
    // recipeVersionId) are pruned — a hand-added row is deliberately left alone.
    if (prune) {
      const actorId =
        asNonEmptyString(
          (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
        ) ?? "system";
      for (const [ingredientId, item] of existing) {
        if (derivedIds.has(ingredientId)) {
          continue;
        }
        if (!asNonEmptyString(item.recipeVersionId)) {
          continue;
        }
        const itemId = asNonEmptyString(item.id);
        if (!itemId) {
          continue;
        }
        const result = await dispatchCommand(
          "remove",
          { reason: "event dish removed", userId: actorId },
          {
            entityName: "PrepListItem",
            instanceId: itemId,
            correlationId: eventId,
            causationId: "EventDishRemoved",
            idempotencyKey: `event-dish-prep:${tenantId}:${eventId}:remove:${prepListId}:${itemId}`,
          }
        );
        bubble(ctx, result);
        if (!result.success) {
          onDiagnostic({
            stage: "remove",
            reason: `PrepListItem.remove failed for ${itemId}: ${result.error ?? "unknown"}`,
            eventId,
            tenantId,
            prepListId,
            detail: { itemId, ingredientId },
          });
        }
      }
    }
  }
}

/** Surface a dispatched command's emitted events on the parent context. */
function bubble(ctx: MiddlewareContext, result: CommandResult): void {
  if (result.emittedEvents) {
    ctx.emittedEvents.push(...result.emittedEvents);
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Coerce to a strictly-positive finite number, else undefined. */
function asPositiveNumber(value: unknown): number | undefined {
  const n = asNumber(value);
  return n !== undefined && n > 0 ? n : undefined;
}

/** Coerce to a non-negative finite number, else undefined. */
function asNonNegativeNumber(value: unknown): number | undefined {
  const n = asNumber(value);
  return n !== undefined && n >= 0 ? n : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Coerce numbers, numeric strings, and Decimal-like objects to a number. */
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { toString?: unknown }).toString === "function"
  ) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Round to `decimals` places to avoid binary float drift in scaled amounts. */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Re-export the shared SeedLine type for consumers that wire diagnostics.
export type { SeedLine };
