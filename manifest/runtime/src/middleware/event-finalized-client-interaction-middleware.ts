/**
 * EventFinalized → ClientInteraction-create middleware.
 *
 * Completes the Event-lifecycle propagation "when an event is COMPLETED, log a
 * post-event CRM activity on that client's timeline" (IMPLEMENTATION_PLAN P1,
 * Event lifecycle → EventFinalized → finance/inventory/followup — the
 * post-event ClientInteraction follow-up leg). It is the closing bookend of the
 * booking↔completion CRM loop: the sibling `event-created-client-interaction`
 * middleware logs an interaction when the event is BOOKED; this one logs one
 * when it is FINALIZED, so the client's timeline shows the full lifecycle without
 * sales re-entering either fact by hand.
 *
 * WHY this is middleware and not a reaction (the crux — same shape as the
 * EventCreated sibling, plus a load):
 *  1. `ClientInteraction.create` REQUIRES a non-empty `employeeId` (a command
 *     `guard employeeId != ""` AND the entity-level `validEmployeeId` block
 *     constraint). `EventFinalized` carries `userId` (the finalizer — a genuine
 *     `Event.finalize(userId)` input param that rides `{ ...commandInput }`), so
 *     attribution IS reachable; but a reaction still cannot satisfy the rest:
 *  2. The CRM touchpoint needs the event's `clientId` and `title` to be useful,
 *     and BOTH are the Event's OWN fields, NOT `finalize` params. The engine
 *     payload is `{ ...commandInput, result }` only and declared event fields are
 *     never auto-populated from `self.*` — `EventFinalized` does not even declare
 *     `clientId`, and its declared `title` is never populated. So the middleware
 *     must LOAD the finalized Event via `_subject.id` to read `clientId`/`title`
 *     (mirrors how `event-updated-board-sync` loads the Event for its snapshot).
 *
 * Dedup is NAMESPACED so this completion interaction coexists with the booking
 * interaction the sibling middleware logs (both correlate to the same eventId):
 * we only treat a prior interaction as a duplicate when it is correlated to this
 * event AND its subject starts with the completion prefix — the booking
 * interaction ("New event booked: …") is correctly ignored.
 *
 * Skips (never silent — every skip reports via `onDiagnostic`):
 *   - clientId empty: a clientless event has no CRM client to log against. No
 *     interaction (logging a blank client+lead would trip warnNoClientOrLead).
 *   - a completion interaction already correlated to this event exists (idempotency).
 *
 * KNOWN LIMITATION (documented, not silent): the dispatched
 * `ClientInteraction.create` runs as the SAME actor that finalized the event and
 * is subject to that entity's policy (`user.role in [sales, sales_rep,
 * sales_manager, manager, admin]`). Finalizing an event is a manager/sales
 * action in practice, so the common case passes; a non-sales actor's finalize is
 * policy-denied and the interaction is skipped with a `create` diagnostic rather
 * than created. Elevating the dispatch identity is out of scope (the runtime has
 * no per-call user override) and would be a governance change.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

const COMPLETION_SUBJECT_PREFIX = "Event completed";

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

export interface EventFinalizedClientInteractionDiagnostic {
  clientId?: string;
  detail?: Record<string, unknown>;
  eventId?: string;
  interactionId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventFinalizedClientInteractionMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EventFinalizedClientInteractionDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface InteractionLike {
  correlationId?: unknown;
  subject?: unknown;
  tenantId?: unknown;
}

interface EventLike {
  clientId?: unknown;
  title?: unknown;
}

const defaultDiagnostic = (
  diag: EventFinalizedClientInteractionDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-finalized-interaction:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    clientId: diag.clientId,
    interactionId: diag.interactionId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createEventFinalizedClientInteractionMiddleware(
  options: EventFinalizedClientInteractionMiddlewareOptions
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

        // clientId + title are the Event's OWN fields — never on the
        // EventFinalized payload — so load the finalized Event to read them.
        const eventStore = storeProvider("Event");
        if (!eventStore) {
          onDiagnostic({
            stage: "stores",
            reason:
              "Event store unavailable — completion interaction not logged",
            eventId,
            tenantId,
          });
          continue;
        }
        const eventRow = (await eventStore.getById(eventId)) as
          | EventLike
          | undefined;
        const clientId = asNonEmptyString(eventRow?.clientId);
        if (!clientId) {
          onDiagnostic({
            stage: "no-client",
            reason: "event has no clientId — skip post-event CRM interaction",
            eventId,
            tenantId,
          });
          continue;
        }

        const interactionStore = storeProvider("ClientInteraction");
        if (!interactionStore) {
          onDiagnostic({
            stage: "stores",
            reason:
              "ClientInteraction store unavailable — interaction not logged",
            eventId,
            clientId,
            tenantId,
          });
          continue;
        }

        // Idempotency: one auto-logged COMPLETION interaction per event. The
        // dedup is namespaced by the completion subject prefix so it coexists
        // with the booking interaction (sibling middleware) that correlates to
        // the same event with subject "New event booked: …".
        const existing = (await interactionStore.getAll()).find((row) => {
          const r = row as InteractionLike;
          return (
            asNonEmptyString(r.tenantId) === tenantId &&
            asNonEmptyString(r.correlationId) === eventId &&
            asString(r.subject).startsWith(COMPLETION_SUBJECT_PREFIX)
          );
        });
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason:
              "completion interaction already logged for this event — skip",
            eventId,
            clientId,
            tenantId,
          });
          continue;
        }

        // employeeId is the finalizing user (a genuine finalize param), falling
        // back to the acting context user, then "system" so the required
        // non-empty guard always passes even for system-triggered finalizes.
        const employeeId =
          asNonEmptyString(payload?.userId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
          ) ??
          "system";

        const title = asNonEmptyString(eventRow?.title);
        const subject = title
          ? `${COMPLETION_SUBJECT_PREFIX}: ${title}`
          : COMPLETION_SUBJECT_PREFIX;

        const interactionId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId.
            id: interactionId,
            tenantId,
            clientId,
            leadId: "",
            employeeId,
            interactionType: "note",
            interactionDate: Date.now(),
            subject,
            description: `Auto-logged CRM activity from event completion (event ${eventId}).`,
            followUpDate: null,
            correlationId: eventId,
          },
          {
            entityName: "ClientInteraction",
            correlationId: eventId,
            causationId: "EventFinalized",
            idempotencyKey: `event-finalized-interaction:${tenantId}:${eventId}`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `ClientInteraction.create failed: ${result.error ?? "unknown"}`,
            eventId,
            clientId,
            interactionId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `post-event CRM interaction logged for event (client ${clientId})`,
          eventId,
          clientId,
          interactionId,
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

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
