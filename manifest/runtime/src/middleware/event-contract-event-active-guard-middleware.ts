/**
 * EventContract.sign → "event must still be active" cross-entity guard middleware.
 *
 * WHY this is middleware and not a constraint (the crux):
 * The rule "you cannot sign a contract for an event that is already over or dead"
 * is a CROSS-ENTITY precondition: it depends on the linked `Event`'s lifecycle
 * status, not on any field of the EventContract that the DSL can usefully gate.
 * `sign()` takes NO params, so the link (`eventId`) is the EventContract's OWN
 * field. The Manifest DSL's `guard`/`constraint` expressions can reference only
 * `self.*`, `user.*`, `context.*`, and command params — they cannot load another
 * entity's live state. So there is no declarative way to express
 * `eventMustBeActive`. The documented escape hatch for multi-hop derivations is a
 * runtime middleware that loads the related entity. This runs at the
 * `before-guard` hook (after policies, before the command's own guards/actions)
 * and SHORT-CIRCUITS the sign when the referenced Event is no longer active.
 *
 * "Active" mirrors the Event entity's own `computed isActive = status == "draft"
 * or status == "confirmed"`. The inverse — a positive "inactive" signal — is the
 * terminal lifecycle set {completed, archived, cancelled} (Event's
 * `isFinalized = completed|archived` plus `isCancelled = cancelled`). Signing a
 * binding contract against a completed/archived event (it already happened) or a
 * cancelled event (the deal is dead) is a correctness bug. This is the
 * cross-entity sibling of the EventStaff.assign → staffMustBeActive guard and the
 * Proposal.send → clientMustBeActive guard; like the latter, the link is the
 * subject's own field, so it is a TWO-HOP load (EventContract → Event).
 *
 * Scoped strictly to `sign` — the binding commitment. create/update assemble a
 * draft; send/markViewed are intermediate routing steps; expire/cancel are
 * already terminal. Signing is the one irreversible act that must not land
 * against a dead event.
 *
 * Fail-open by design (validation, not infra enforcement): if the
 * EventContract/Event store is unavailable, the contract row is not found, the
 * contract has no event attached, or the event row is not found, the command
 * proceeds. The middleware ONLY blocks when it positively finds the Event row AND
 * its status is one of the terminal/inactive states. Every block reports through
 * `onDiagnostic` — never silent.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

export interface EventContractEventActiveGuardDiagnostic {
  contractId?: string;
  detail?: Record<string, unknown>;
  eventId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventContractEventActiveGuardMiddlewareOptions {
  onDiagnostic?: (diag: EventContractEventActiveGuardDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface EventContractLike {
  eventId?: unknown;
}

interface EventLike {
  status?: unknown;
  tenantId?: unknown;
}

/**
 * The Event lifecycle states in which signing a contract is meaningless: the
 * event has either already run (`completed`/`archived`) or been called off
 * (`cancelled`). Mirrors Event's `isFinalized` + `isCancelled` computeds. Any
 * other status (`draft`/`confirmed`, or a future-added state) is treated as
 * active → fail-open, never block.
 */
const INACTIVE_EVENT_STATUSES = new Set<string>([
  "completed",
  "archived",
  "cancelled",
]);

const defaultDiagnostic = (
  diag: EventContractEventActiveGuardDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-contract-event-active:${diag.stage}] ${diag.reason}`, {
    contractId: diag.contractId,
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createEventContractEventActiveGuardMiddleware(
  options: EventContractEventActiveGuardMiddlewareOptions
): Middleware {
  const { storeProvider, onDiagnostic = defaultDiagnostic } = options;

  return {
    hooks: ["before-guard"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Scope strictly to `sign`. create/update assemble a draft; send/markViewed
      // are intermediate routing; expire/cancel are terminal. Signing is the
      // irreversible commitment that must not target a dead event.
      if (
        !(ctx.entityName === "EventContract" && ctx.command.name === "sign")
      ) {
        return {};
      }

      const contractId = asNonEmptyString(ctx.input.id);
      // The command resolves the subject by id; a missing id is its own concern.
      if (!contractId) {
        return {};
      }

      const contractStore = storeProvider("EventContract");
      if (!contractStore) {
        onDiagnostic({
          stage: "store",
          reason:
            "EventContract store unavailable — event active check skipped",
          contractId,
        });
        return {};
      }

      const contract = (await contractStore.getById(contractId)) as
        | EventContractLike
        | undefined;
      if (!contract) {
        // Not found — the command's own subject resolution handles that.
        onDiagnostic({
          stage: "load-contract",
          reason: "EventContract not found — event active check skipped",
          contractId,
        });
        return {};
      }

      const eventId = asNonEmptyString(contract.eventId);
      // An eventless contract (shouldn't happen — requireEvent constraint — but
      // fail-open rather than block on a malformed row).
      if (!eventId) {
        return {};
      }

      const eventStore = storeProvider("Event");
      if (!eventStore) {
        onDiagnostic({
          stage: "store",
          reason: "Event store unavailable — active check skipped",
          contractId,
          eventId,
        });
        return {};
      }

      const event = (await eventStore.getById(eventId)) as
        | EventLike
        | undefined;
      if (!event) {
        // Out of scope: "not found" is not "inactive".
        onDiagnostic({
          stage: "load-event",
          reason: "Event not found — active check skipped",
          contractId,
          eventId,
        });
        return {};
      }

      const status = asNonEmptyString(event.status);
      // Only a positive inactive signal blocks; unknown/active statuses proceed.
      if (status && INACTIVE_EVENT_STATUSES.has(status)) {
        const reason = `Cannot sign contract ${contractId}: event ${eventId} is ${status} (no longer active)`;
        onDiagnostic({
          stage: "blocked",
          reason,
          contractId,
          eventId,
          tenantId: asNonEmptyString(event.tenantId),
          detail: { status },
        });
        return {
          shortCircuit: true,
          result: {
            success: false,
            error: reason,
            emittedEvents: [],
          } satisfies CommandResult,
        };
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
