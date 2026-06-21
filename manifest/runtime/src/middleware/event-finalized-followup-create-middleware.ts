/**
 * EventFinalized → EventFollowup-create middleware.
 *
 * Completes the Event-lifecycle propagation "when an event is COMPLETED, open a
 * post-event follow-up task so the close-out work (thank-you, review request,
 * final reconciliation) actually lands on someone's list" (IMPLEMENTATION_PLAN
 * P1, Event lifecycle → EventFinalized → finance/inventory/followup — the
 * post-event `EventFollowup` leg). It is the action-item sibling of the
 * `event-finalized-client-interaction` middleware: that one logs a passive CRM
 * note on the client's timeline; this one creates an ACTIONABLE governed
 * `EventFollowup` task assigned to the finalizer. `EventFollowup` existed in the
 * IR (events-extended-rules.manifest) but had ZERO producers — finalizing an
 * event opened nothing, so post-event work depended on someone remembering.
 *
 * WHY this is middleware and not a reaction:
 *  1. `EventFollowup.create` requires a non-empty `eventId` in the command BODY.
 *     `EventFinalized` declares `eventId` but never populates it — the engine
 *     payload is `{ ...commandInput, result }` and declared event fields are
 *     never auto-populated from `self.*`; `Event.finalize(userId)` takes only
 *     `userId`, so `payload.eventId` is structurally `undefined`. The event id is
 *     reachable only via `event.subject?.id`, which a declarative reaction
 *     binding cannot wire into a create-body param robustly.
 *  2. The follow-up's description is enriched with the event's `title`, which is
 *     the Event's OWN field (not a `finalize` param) — so the middleware LOADS
 *     the finalized Event via `_subject.id` (mirrors `event-updated-board-sync`).
 *  3. Idempotency requires scanning existing `EventFollowup` rows so a re-emitted
 *     `EventFinalized` (replay / unfinalize→finalize) cannot stack duplicate
 *     auto-tasks — a reaction has no store read.
 *
 * Dedup is NAMESPACED by the auto-task `taskType` so this auto-created follow-up
 * coexists with any manually-created follow-ups of other types for the same
 * event: we only treat a prior row as a duplicate when it is for this event AND
 * carries the auto `taskType`.
 *
 * Skips (never silent — every skip reports via `onDiagnostic`):
 *   - eventId/tenantId unresolved (cannot target a row).
 *   - an auto follow-up already exists for this event (idempotency).
 * Works for clientless events too (a follow-up attaches to the event, not a
 * client) — unlike the CRM-interaction sibling, there is no client gate.
 *
 * KNOWN LIMITATION (documented, not silent): the dispatched `EventFollowup.create`
 * runs as the SAME actor that finalized the event and is subject to that entity's
 * policy (`user.role in [staff, event_coordinator, catering_manager,
 * event_manager, manager, admin]`). That policy is broad enough that any realistic
 * finalizing actor passes; an actor outside it is policy-denied and the task is
 * skipped with a `create` diagnostic rather than created. The runtime has no
 * per-call user override, so elevating the dispatch identity would be a governance
 * change and is out of scope.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

/** The `taskType` namespacing this middleware's auto-created follow-ups. */
const AUTO_FOLLOWUP_TYPE = "post_event_followup";
/** Default window the close-out work is due within after completion. */
const FOLLOWUP_DUE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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

export interface EventFinalizedFollowupDiagnostic {
  detail?: Record<string, unknown>;
  eventId?: string;
  followupId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventFinalizedFollowupMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EventFinalizedFollowupDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface FollowupLike {
  eventId?: unknown;
  taskType?: unknown;
  tenantId?: unknown;
}

interface EventLike {
  title?: unknown;
}

const defaultDiagnostic = (diag: EventFinalizedFollowupDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-finalized-followup:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    followupId: diag.followupId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createEventFinalizedFollowupCreateMiddleware(
  options: EventFinalizedFollowupMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const finalizedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "EventFinalized" &&
          ctx.entityName === "Event" &&
          ctx.command.name === "finalize"
      );

      for (const event of finalizedEvents) {
        const payload = event.payload as
          | { tenantId?: unknown; userId?: unknown }
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
            reason: `EventFinalized missing ${eventId ? "tenantId" : "eventId"}`,
            eventId,
            tenantId,
          });
          continue;
        }

        const followupStore = storeProvider("EventFollowup");
        if (!followupStore) {
          onDiagnostic({
            stage: "stores",
            reason: "EventFollowup store unavailable — follow-up not created",
            eventId,
            tenantId,
          });
          continue;
        }

        // Idempotency: one auto follow-up per event. Namespaced by the auto
        // taskType so it coexists with manually-created follow-ups of other types.
        const existing = (await followupStore.getAll()).find((row) => {
          const r = row as FollowupLike;
          return (
            asNonEmptyString(r.tenantId) === tenantId &&
            asNonEmptyString(r.eventId) === eventId &&
            asNonEmptyString(r.taskType) === AUTO_FOLLOWUP_TYPE
          );
        });
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason: "auto follow-up already exists for this event — skip",
            eventId,
            tenantId,
          });
          continue;
        }

        // title is the Event's OWN field — never on the EventFinalized payload —
        // so load the finalized Event to enrich the description (best-effort).
        const eventStore = storeProvider("Event");
        const eventRow = (await eventStore?.getById(eventId)) as
          | EventLike
          | undefined;
        const title = asNonEmptyString(eventRow?.title);
        const description = title
          ? `Post-event follow-up for ${title}`
          : "Post-event follow-up";

        // assignedTo = the finalizing user (a genuine finalize param), falling
        // back to the acting context user, then "" (assignedTo is optional).
        const assignedTo =
          asNonEmptyString(payload?.userId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
          ) ??
          "";

        const followupId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId.
            id: followupId,
            tenantId,
            eventId,
            taskType: AUTO_FOLLOWUP_TYPE,
            description,
            dueDate: Date.now() + FOLLOWUP_DUE_WINDOW_MS,
            assignedTo,
            notes: `Auto-opened on event completion (event ${eventId}).`,
          },
          {
            entityName: "EventFollowup",
            correlationId: eventId,
            causationId: "EventFinalized",
            idempotencyKey: `event-finalized-followup:${tenantId}:${eventId}`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `EventFollowup.create failed: ${result.error ?? "unknown"}`,
            eventId,
            followupId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "post-event follow-up task opened",
          eventId,
          followupId,
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
