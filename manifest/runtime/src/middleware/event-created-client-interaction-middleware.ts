/**
 * EventCreated → ClientInteraction-create middleware.
 *
 * Completes the Event-lifecycle propagation "when an event is booked for a
 * client, log a CRM activity on that client's timeline" (IMPLEMENTATION_PLAN P1,
 * Event lifecycle → CRM activity) — the part the declarative DSL cannot express.
 *
 * WHY this is middleware and not the reaction the plan first proposed (the crux):
 * `ClientInteraction.create` REQUIRES a non-empty `employeeId` (both a command
 * `guard employeeId != ""` and the entity-level `validEmployeeId` block
 * constraint). `EventCreated` carries no creator/employee field — `Event.create`
 * has no `userId`/`createdBy` param, and declared event fields are never
 * auto-populated from `self.*` — so `payload.employeeId` is structurally
 * `undefined`. A pure `on EventCreated run ClientInteraction.create` reaction
 * could therefore never satisfy the create guard (it would fail and be
 * logged-and-swallowed → zero interactions). The middleware instead sources the
 * employee from the runtime context's acting user (the person who ran
 * `Event.create`, which is exactly who the CRM touchpoint should be attributed
 * to) and dispatches the governed `ClientInteraction.create`.
 *
 * Reads come straight off the payload — no source store load is needed:
 *   - clientId : an `Event.create` input param → rides `{ ...commandInput }`.
 *   - tenantId : declared on `EventCreated` and supplied from context.
 *   - title    : an `Event.create` input param → rides the payload.
 *   - event id : `event.subject?.id` (the engine-stamped source instance id) —
 *                the declared `eventId` field is NOT auto-populated, mirroring how
 *                the EventCreated→BattleBoard reaction reads `payload.result.id`.
 *
 * Skips (never silent — every skip reports via `onDiagnostic`):
 *   - clientId empty: a clientless event has no CRM client to log against (and a
 *     blank client+lead would trip `warnNoClientOrLead`). No interaction.
 *   - an interaction already correlated to this event exists (idempotency).
 *
 * KNOWN LIMITATION (documented, not silent): the dispatched
 * `ClientInteraction.create` runs as the SAME actor that created the event and is
 * subject to that entity's policy (`user.role in [sales, sales_rep,
 * sales_manager, manager, admin]`). Event booking is a sales/manager action in
 * practice, so the common case passes; if a non-sales actor creates an event the
 * dispatch is policy-denied and the interaction is skipped with a `create`
 * diagnostic rather than created. Elevating the dispatch identity is out of scope
 * (the runtime has no per-call user override) and would be a governance change.
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

export interface EventClientInteractionDiagnostic {
  clientId?: string;
  detail?: Record<string, unknown>;
  eventId?: string;
  interactionId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventCreatedClientInteractionMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EventClientInteractionDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface InteractionLike {
  correlationId?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: EventClientInteractionDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-interaction:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    clientId: diag.clientId,
    interactionId: diag.interactionId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createEventCreatedClientInteractionMiddleware(
  options: EventCreatedClientInteractionMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const createdEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "EventCreated" &&
          ctx.entityName === "Event" &&
          ctx.command.name === "create"
      );

      for (const event of createdEvents) {
        const payload = event.payload as
          | { clientId?: unknown; tenantId?: unknown; title?: unknown }
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
            reason: `EventCreated missing ${eventId ? "tenantId" : "eventId"}`,
            eventId,
            tenantId,
          });
          continue;
        }

        // A client is mandatory for a CRM touchpoint. Events created without a
        // client (clientId defaults to "" on Event) get no interaction — logging
        // one would be meaningless and trip ClientInteraction's warnNoClientOrLead.
        const clientId = asNonEmptyString(payload?.clientId);
        if (!clientId) {
          onDiagnostic({
            stage: "no-client",
            reason: "event has no clientId — skip CRM interaction",
            eventId,
            tenantId,
          });
          continue;
        }

        const interactionStore = storeProvider("ClientInteraction");
        if (!interactionStore) {
          onDiagnostic({
            stage: "stores",
            reason: "ClientInteraction store unavailable — interaction not logged",
            eventId,
            clientId,
            tenantId,
          });
          continue;
        }

        // Idempotency: one auto-logged interaction per event. We correlate the
        // interaction to the event via correlationId, so a re-emitted EventCreated
        // (or a re-run) does not stack duplicate timeline entries. The dispatch
        // idempotencyKey below is the primary guard; this scan also dedupes if the
        // same event id is somehow re-created.
        const existing = (await interactionStore.getAll()).find(
          (row) =>
            asNonEmptyString((row as InteractionLike).tenantId) === tenantId &&
            asNonEmptyString((row as InteractionLike).correlationId) === eventId
        );
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason: "interaction already logged for this event — skip",
            eventId,
            clientId,
            tenantId,
          });
          continue;
        }

        // employeeId is the acting user (who booked the event) — the correct CRM
        // attribution. Fall back to "system" so the required non-empty guard always
        // passes even if the context omits a user id (e.g. system-triggered creates).
        const employeeId =
          asNonEmptyString(
            (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
          ) ?? "system";

        const title = asNonEmptyString(payload?.title);
        const subject = title ? `New event booked: ${title}` : "New event booked";

        const interactionId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId —
            // passing instanceId targets an existing instance and the row is never
            // persisted (mirrors lead-deal / prep-list-seed item creates).
            id: interactionId,
            tenantId,
            clientId,
            leadId: "",
            employeeId,
            interactionType: "note",
            interactionDate: Date.now(),
            subject,
            description: `Auto-logged CRM activity from event creation (event ${eventId}).`,
            followUpDate: null,
            correlationId: eventId,
          },
          {
            entityName: "ClientInteraction",
            correlationId: eventId,
            causationId: "EventCreated",
            idempotencyKey: `event-interaction:${tenantId}:${eventId}`,
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
          reason: `CRM interaction logged for event (client ${clientId})`,
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
