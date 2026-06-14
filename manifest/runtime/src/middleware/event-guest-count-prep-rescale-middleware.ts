/**
 * EventGuestCountUpdated → PrepList / PrepListItem rescale middleware.
 *
 * Implements the Event-lifecycle propagation "when an event's guest count
 * changes, rescale its prep" (IMPLEMENTATION_PLAN P1, Event lifecycle →
 * "EventGuestCountUpdated → PrepList / inventory / budget").
 *
 * THE BUG it fixes: a PrepList's `batchMultiplier` is set ONCE at seed time
 * (the `EventConfirmed run PrepList.create` reaction hardcodes `batchMultiplier:
 * 1`) and the per-ingredient `PrepListItem.scaledQuantity` rows are derived once
 * from the event's guest count at seed time. Nothing recomputes either when the
 * guest count later changes. So booking 120 guests, seeding the prep, then
 * bumping to 240 leaves the kitchen prepping for 120 — a silent, food-quantity
 * correctness defect.
 *
 * WHY middleware and not a reaction (two independent blockers):
 *   1. 1:N fan-out — one Event has many PrepLists, each with many PrepListItems;
 *      a declarative `on EventGuestCountUpdated run …` reaction resolves exactly
 *      ONE target instance and structurally cannot reach the set (same reason
 *      the EventCancelled cascade and the board-sync are middleware).
 *   2. The OLD guest count is unreachable from a reaction. The rescale is a
 *      RATIO (new/old). `updateGuestCount` does `mutate guestCount = newGuestCount`
 *      then emits, and the emitted payload is `{ ...commandInput, result }` only —
 *      the declared `oldGuestCount` event field is NEVER auto-populated from
 *      `self.*`. By the time any `after-emit` consumer runs, the stored Event row
 *      already carries the NEW count, so the old value is gone.
 *
 * HOW it captures the ratio: the engine threads a single `evalContext` object
 * through every middleware hook of one `runCommand`, and overwrites
 * `evalContext.self` with the POST-mutation instance only after the action loop.
 * So this middleware runs on TWO hooks:
 *   • `before-guard` — `evalContext.self.guestCount` is still the OLD count;
 *     stash it via `contextPatch` (merged into the same evalContext).
 *   • `after-emit`  — read `payload.newGuestCount` (a genuine `updateGuestCount`
 *     input param, so it rides the payload) and the stashed old count, compute
 *     `ratio = new / old`, and fan out the rescale.
 *
 * SCOPE — draft prep lists only. `PrepList.updateBatchMultiplier` guards
 * `status == "draft"`, and a finalized/completed prep list is locked for kitchen
 * execution against fixed quantities (changing them mid-service would be wrong).
 * Guest counts realistically change during planning, while the list is still
 * draft, so this covers the real case and never disturbs in-flight service.
 *
 * Per list: `PrepList.updateBatchMultiplier(batchMultiplier * ratio)` keeps the
 * UI-visible scaling knob honest, and `PrepListItem.updateQuantity` scales each
 * row's `scaledQuantity` by the ratio while leaving `baseQuantity` (the recipe
 * base, guest-independent) untouched — mirroring the seed's
 * `scaled = base * factor` relationship.
 *
 * Idempotency keys embed the target `newGuestCount`, so a re-delivered event for
 * the same count dedups, while a subsequent genuine change to a DIFFERENT count
 * re-applies (ratio chaining off the new old=previous count stays correct).
 *
 * Every skip/failure reports through `onDiagnostic` (default console.warn) —
 * never silently.
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

export interface EventGuestCountRescaleDiagnostic {
  detail?: Record<string, unknown>;
  eventId?: string;
  prepListId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventGuestCountPrepRescaleMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EventGuestCountRescaleDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

/** evalContext key used to carry the pre-mutation guest count across hooks. */
const OLD_GUEST_COUNT_KEY = "__eventGuestCountPrepRescale_old";

/** Below this absolute ratio delta the change is treated as a no-op. */
const RATIO_EPSILON = 1e-6;

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
  baseUnit?: unknown;
  id?: unknown;
  prepListId?: unknown;
  scaledQuantity?: unknown;
  scaledUnit?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: EventGuestCountRescaleDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-guest-rescale:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    prepListId: diag.prepListId,
    ...diag.detail,
  });
};

export function createEventGuestCountPrepRescaleMiddleware(
  options: EventGuestCountPrepRescaleMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["before-guard", "after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Only the Event.updateGuestCount lifecycle is relevant.
      if (ctx.entityName !== "Event" || ctx.command.name !== "updateGuestCount") {
        return {};
      }

      // Phase 1 (before-guard): snapshot the OLD guest count before the mutate
      // overwrites it. evalContext.self is still the pre-mutation instance here.
      if (ctx.hook === "before-guard") {
        const self = ctx.evalContext.self as
          | { guestCount?: unknown }
          | undefined;
        const oldGuestCount = asPositiveNumber(self?.guestCount);
        return { contextPatch: { [OLD_GUEST_COUNT_KEY]: oldGuestCount ?? null } };
      }

      if (ctx.hook !== "after-emit") {
        return {};
      }

      // Phase 2 (after-emit): fan out the rescale.
      const triggers = ctx.emittedEvents.filter(
        (event) => event.name === "EventGuestCountUpdated"
      );
      if (triggers.length === 0) {
        return {};
      }

      const oldGuestCount = asPositiveNumber(ctx.evalContext[OLD_GUEST_COUNT_KEY]);
      const seen = new Set<string>();

      for (const event of triggers) {
        const payload = event.payload as
          | { newGuestCount?: unknown; tenantId?: unknown }
          | undefined;

        const eventId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(eventId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `EventGuestCountUpdated missing ${eventId ? "tenantId" : "eventId"}`,
            eventId,
            tenantId,
          });
          continue;
        }
        if (seen.has(eventId)) {
          continue;
        }
        seen.add(eventId);

        // newGuestCount is a genuine updateGuestCount input param → on the payload.
        const newGuestCount =
          asPositiveNumber(payload?.newGuestCount) ??
          asPositiveNumber(
            (ctx.evalContext.self as { guestCount?: unknown } | undefined)
              ?.guestCount
          );

        if (!(oldGuestCount && newGuestCount)) {
          onDiagnostic({
            stage: "ratio",
            reason: "could not resolve old/new guest count — rescale skipped",
            eventId,
            tenantId,
            detail: { oldGuestCount, newGuestCount },
          });
          continue;
        }

        const ratio = newGuestCount / oldGuestCount;
        if (!Number.isFinite(ratio) || ratio <= 0) {
          onDiagnostic({
            stage: "ratio",
            reason: "non-finite or non-positive rescale ratio — skipped",
            eventId,
            tenantId,
            detail: { oldGuestCount, newGuestCount, ratio },
          });
          continue;
        }
        if (Math.abs(ratio - 1) < RATIO_EPSILON) {
          // Guest count unchanged (or a rounding wash) — nothing to do.
          continue;
        }

        const prepListStore = storeProvider("PrepList");
        if (!prepListStore) {
          onDiagnostic({
            stage: "stores",
            reason: "PrepList store unavailable — rescale skipped",
            eventId,
            tenantId,
          });
          continue;
        }

        // Draft prep lists for this event only (finalized/completed are locked
        // for execution; updateBatchMultiplier also guards status == "draft").
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
          // Common: event has no draft prep list (not seeded yet / already
          // finalized). Not an error.
          continue;
        }

        const prepListItemStore = storeProvider("PrepListItem");
        if (!prepListItemStore) {
          onDiagnostic({
            stage: "stores",
            reason: "PrepListItem store unavailable — rescale skipped",
            eventId,
            tenantId,
          });
          continue;
        }
        const allItems = (await prepListItemStore.getAll()).map(
          (row) => row as PrepListItemRow
        );

        for (const prepList of prepLists) {
          const prepListId = asNonEmptyString(prepList.id);
          if (!prepListId) {
            continue;
          }

          // Rescale the batch multiplier (the UI-visible scaling knob).
          const oldMultiplier = asPositiveNumber(prepList.batchMultiplier) ?? 1;
          const newMultiplier = roundTo(oldMultiplier * ratio, 4);
          const bmResult = await dispatchCommand(
            "updateBatchMultiplier",
            { newMultiplier },
            {
              entityName: "PrepList",
              instanceId: prepListId,
              correlationId: eventId,
              causationId: event.name,
              idempotencyKey: `event-guest-rescale:${tenantId}:${eventId}:${newGuestCount}:list:${prepListId}`,
            }
          );
          if (bmResult.emittedEvents) {
            ctx.emittedEvents.push(...bmResult.emittedEvents);
          }
          if (!bmResult.success) {
            onDiagnostic({
              stage: "dispatch",
              reason: `PrepList.updateBatchMultiplier failed: ${bmResult.error ?? "unknown"}`,
              eventId,
              tenantId,
              prepListId,
              detail: { newMultiplier },
            });
          }

          // Rescale each ingredient row's scaledQuantity by the same ratio;
          // baseQuantity (the guest-independent recipe base) is left intact.
          const items = allItems.filter(
            (item) =>
              asNonEmptyString(item.tenantId) === tenantId &&
              asNonEmptyString(item.prepListId) === prepListId
          );
          for (const item of items) {
            const itemId = asNonEmptyString(item.id);
            if (!itemId) {
              continue;
            }
            const baseQuantity = asNonNegativeNumber(item.baseQuantity) ?? 0;
            const oldScaled = asNonNegativeNumber(item.scaledQuantity) ?? 0;
            const newScaledQuantity = roundTo(oldScaled * ratio, 4);
            const itemResult = await dispatchCommand(
              "updateQuantity",
              {
                newBaseQuantity: baseQuantity,
                newScaledQuantity,
                newBaseUnit: asString(item.baseUnit),
                newScaledUnit: asString(item.scaledUnit),
              },
              {
                entityName: "PrepListItem",
                instanceId: itemId,
                correlationId: eventId,
                causationId: event.name,
                idempotencyKey: `event-guest-rescale:${tenantId}:${eventId}:${newGuestCount}:item:${itemId}`,
              }
            );
            if (itemResult.emittedEvents) {
              ctx.emittedEvents.push(...itemResult.emittedEvents);
            }
            if (!itemResult.success) {
              onDiagnostic({
                stage: "dispatch",
                reason: `PrepListItem.updateQuantity failed for ${itemId}: ${itemResult.error ?? "unknown"}`,
                eventId,
                tenantId,
                prepListId,
                detail: { itemId, newScaledQuantity },
              });
            }
          }
        }
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Coerce to a string, defaulting to "" (empty is a valid unit value). */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
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

/** Coerce numbers, numeric strings, and Decimal-like objects to a number. */
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  // Prisma Decimal (and similar) expose a numeric toString().
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
