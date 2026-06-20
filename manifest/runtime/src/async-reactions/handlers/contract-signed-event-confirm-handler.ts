/**
 * Async reaction handler for Contract signed → Event confirm.
 *
 * Deferred counterpart of {@link createContractSignedEventConfirmMiddleware}.
 * When `ContractSigned` fires, the middleware (with async enabled) ENQUEUES a
 * job; this handler runs LATER in the worker, loads the EventContract to
 * resolve `eventId`, then loads the linked Event, and dispatches the governed
 * `Event.confirm`. The `eventId` is the contract's OWN field — read from the
 * loaded row, not the event payload (`sign` takes no params, so the payload
 * carries only `result`).
 *
 * Guard-safe + idempotent: only dispatches when the linked Event is still
 * `draft` (the exact state `Event.confirm`'s `guard self.status == "draft"`
 * requires). An already-confirmed/cancelled event is skipped cleanly rather
 * than producing a swallowed guard failure. The dispatch idempotency key is
 * per (tenant, contract), so a redelivered job finds the event already
 * confirmed and no-ops.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const CONTRACT_SIGNED_EVENT_CONFIRM_REACTION =
  "contractSignedEventConfirm";

interface ContractLike {
  eventId?: unknown;
  tenantId?: unknown;
}

interface EventLike {
  status?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const contractSignedEventConfirmHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const contractId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;

    if (!contractId) {
      log.warn?.(
        "contractSignedEventConfirm: missing subjectId — skipping",
        { jobId: job.id },
      );
      return;
    }

    const contractStore = storeProvider("EventContract") as
      | ManifestStore
      | undefined;
    const eventStore = storeProvider("Event") as ManifestStore | undefined;
    if (!(contractStore && eventStore)) {
      throw new Error("EventContract or Event store unavailable");
    }

    const contract = (await contractStore.getById(contractId)) as
      | ContractLike
      | undefined;
    if (!contract) {
      log.warn?.(
        "contractSignedEventConfirm: contract not found — skipping",
        { jobId: job.id, contractId },
      );
      return;
    }

    const eventId = asNonEmptyString(contract.eventId);
    if (!eventId) {
      log.warn?.(
        "contractSignedEventConfirm: contract has no eventId — skipping",
        { jobId: job.id, contractId },
      );
      return;
    }

    const eventRow = (await eventStore.getById(eventId)) as
      | EventLike
      | undefined;
    if (!eventRow) {
      log.warn?.(
        "contractSignedEventConfirm: linked event not found — skipping",
        { jobId: job.id, contractId, eventId },
      );
      return;
    }

    const eventStatus = asNonEmptyString(eventRow.status);
    if (eventStatus !== "draft") {
      log.warn?.(
        "contractSignedEventConfirm: event not in draft — skipping",
        {
          jobId: job.id,
          contractId,
          eventId,
          eventStatus: eventStatus ?? "?",
        },
      );
      return;
    }

    const result = await dispatchCommand(
      "confirm",
      {
        id: eventId,
        tenantId,
        userId: "system",
      },
      {
        entityName: "Event",
        instanceId: eventId,
        correlationId: contractId,
        causationId: "ContractSigned",
        idempotencyKey:
          job.idempotencyKey ??
          `contract-signed:${tenantId}:${contractId}`,
      },
    );

    if (!result.success) {
      throw new Error(
        `Event.confirm failed for contract ${contractId} → event ${eventId}: ${result.error ?? "unknown"}`,
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
