/**
 * Contract-signed → Event-confirm middleware.
 *
 * Completes the propagation "when a client signs an event contract, automatically
 * confirm the event" — the cascade that ties a signed contract to the event going
 * live.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `EventContract.sign` is a MUTATE command (it `mutate status = "signed"`), so the
 * engine's emitted payload is `{ ...commandInput, result }` where `result` is the
 * LAST mutate's scalar (`signedAt = now()`), NOT the EventContract instance. The
 * event to confirm is identified by `EventContract.eventId`, which is the contract's
 * OWN field — and `sign()` takes NO input params, so the payload carries nothing but
 * `result` + `payload._subject.id`. Declared event fields (`ContractSigned.eventId`)
 * are NEVER auto-populated from `self.*`. So the prior `on ContractSigned run
 * Event.confirm` reaction reading `resolve payload.result.eventId` was a SILENT
 * NO-OP: `payload.result` is the `now()` scalar, `.eventId` is `undefined`, the
 * reaction resolves no target instance, and the error is logged-and-swallowed → the
 * event was never confirmed. Reading `payload.eventId` would not help either (it is
 * not a `sign` input param). The only caller (the contract-status route,
 * `apps/api/app/api/events/contracts/[id]/status/route.ts`, `buildPayload: () => ({})`)
 * holds only the contract id, not the eventId — so adding `eventId` as a `sign` param
 * would both pollute the command contract with its own entity's field AND force the
 * caller to load the contract first. This middleware instead LOADS the signed
 * EventContract from the store (the engine-cleaner mechanism for entity-owned
 * fields), reads `self.eventId`, and dispatches the governed `Event.confirm`.
 *
 * Idempotent / guard-safe: only dispatches when the linked Event is still `draft`
 * (the exact state `Event.confirm`'s `guard self.status == "draft"` requires); an
 * already-confirmed/cancelled event is skipped rather than producing a swallowed
 * guard failure. Every skip and failure reports through `onDiagnostic` — never
 * silent.
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

export interface ContractSignedEventConfirmDiagnostic {
  contractId?: string;
  detail?: Record<string, unknown>;
  eventId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface ContractSignedEventConfirmMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: ContractSignedEventConfirmDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ContractLike {
  eventId?: unknown;
  tenantId?: unknown;
}

interface EventLike {
  status?: unknown;
}

const defaultDiagnostic = (diag: ContractSignedEventConfirmDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[contract-event:${diag.stage}] ${diag.reason}`, {
    contractId: diag.contractId,
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createContractSignedEventConfirmMiddleware(
  options: ContractSignedEventConfirmMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const signedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "ContractSigned" &&
          ctx.entityName === "EventContract" &&
          ctx.command.name === "sign"
      );

      for (const event of signedEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const contractId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(contractId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `ContractSigned missing ${contractId ? "tenantId" : "contractId"}`,
            contractId,
            tenantId,
          });
          continue;
        }

        const contractStore = storeProvider("EventContract");
        const eventStore = storeProvider("Event");
        if (!(contractStore && eventStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "EventContract or Event store unavailable — event not confirmed",
            contractId,
            tenantId,
            detail: { contract: !!contractStore, event: !!eventStore },
          });
          continue;
        }

        const contract = (await contractStore.getById(contractId)) as
          | ContractLike
          | undefined;
        if (!contract) {
          onDiagnostic({
            stage: "load",
            reason: "signed contract not found in store — cannot resolve event",
            contractId,
            tenantId,
          });
          continue;
        }

        const eventId = asNonEmptyString(contract.eventId);
        if (!eventId) {
          onDiagnostic({
            stage: "eventId",
            reason: "signed contract has no eventId — nothing to confirm",
            contractId,
            tenantId,
          });
          continue;
        }

        // Guard-safe + idempotent: Event.confirm requires `self.status == "draft"`.
        // If the event is already confirmed/cancelled/etc., dispatching would only
        // produce a swallowed guard failure — skip cleanly instead.
        const eventRow = (await eventStore.getById(eventId)) as
          | EventLike
          | undefined;
        if (!eventRow) {
          onDiagnostic({
            stage: "event-load",
            reason: "linked event not found in store — cannot confirm",
            contractId,
            eventId,
            tenantId,
          });
          continue;
        }
        const eventStatus = asNonEmptyString(eventRow.status);
        if (eventStatus !== "draft") {
          onDiagnostic({
            stage: "already",
            reason: `event not in draft (status="${eventStatus ?? "?"}") — skip confirm`,
            contractId,
            eventId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "confirm",
          {
            // A `confirm` is a MUTATE on the existing Event. The target id is
            // supplied BOTH in the body (`id`, the way the contract-status route
            // resolves mutate targets) AND as `instanceId` (the way the prep
            // middleware does) so the write-back persists to the right row
            // regardless of which the engine keys persistence on.
            id: eventId,
            tenantId,
            userId: "system",
          },
          {
            entityName: "Event",
            instanceId: eventId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? contractId,
            causationId: "ContractSigned",
            idempotencyKey: `contract-event:${tenantId}:${eventId}:confirm`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "confirm",
            reason: `Event.confirm failed: ${result.error ?? "unknown"}`,
            contractId,
            eventId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "event confirmed from signed contract",
          contractId,
          eventId,
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
