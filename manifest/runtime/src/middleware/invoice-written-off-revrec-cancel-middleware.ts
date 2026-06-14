/**
 * Invoice-written-off → RevenueRecognitionSchedule-cancel middleware.
 *
 * Closes a real accounting-correctness gap: when an invoice is written off as
 * uncollectable, any revenue-recognition schedule still recognizing revenue
 * against that invoice must STOP. Otherwise the books keep accruing earned
 * revenue on a debt that will never be collected — overstating recognized
 * revenue and leaving PENDING/IN_PROGRESS schedules dangling forever.
 * `InvoiceWrittenOff` (invoice-rules.manifest:231) had ZERO consumers and
 * `RevenueRecognitionSchedule.cancel` (revenue-recognition-rules.manifest:172)
 * was unreachable from the invoice lifecycle (IMPLEMENTATION_PLAN P1, Finance &
 * collections).
 *
 * WHY this is middleware and not a reaction (the crux):
 * `Invoice.writeOff(reason, writeOffAmount)` is a MUTATE command (last mutate
 * `amountDue = 0`), so the engine's emitted payload is `{ ...commandInput, result }`
 * where `result` is a scalar, NOT the Invoice instance. The schedule(s) to cancel
 * are identified by `RevenueRecognitionSchedule.invoiceId` — the SCHEDULE's OWN
 * field, on the related (child) entity, not anything the writeOff command carries.
 * A reaction resolves exactly one target instance and cannot scan the schedule
 * store by `invoiceId`; this is also a 1:N fan-out (one invoice may have several
 * recognition schedules). Both reasons force middleware. The `reason` param IS a
 * writeOff input, so it rides the payload and is forwarded to `cancel`.
 *
 * Mirror of the scan-by-invoiceId pattern in
 * `invoice-overdue-collection-case-create-middleware.ts` plus the dispatch-mutate
 * pattern in `collection-written-off-invoice-write-off-middleware.ts`.
 *
 * Guard-safe + idempotent: only schedules in a cancellable state
 * (PENDING / IN_PROGRESS / PAUSED — mirroring `cancel`'s guard and the FSM) are
 * dispatched; COMPLETED/CANCELLED schedules are skipped so a skip is a clean no-op
 * rather than a swallowed guard failure. A per-schedule static `idempotencyKey`
 * dedups a re-emitted event; an invoice is written off once (terminal), so this
 * never collides with a legitimate second cancel. Every skip and failure reports
 * through `onDiagnostic` — never silent.
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

export interface InvoiceWrittenOffRevRecCancelDiagnostic {
  detail?: Record<string, unknown>;
  invoiceId?: string;
  reason: string;
  scheduleId?: string;
  stage: string;
  tenantId?: string;
}

export interface InvoiceWrittenOffRevRecCancelMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: InvoiceWrittenOffRevRecCancelDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface RevenueScheduleLike {
  id?: unknown;
  invoiceId?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

// RevenueRecognitionSchedule.cancel guards `self.status in ["PENDING",
// "IN_PROGRESS", "PAUSED"]` (the only states with a CANCELLED transition target).
// Mirror it so a non-cancellable schedule (COMPLETED/CANCELLED) is skipped cleanly
// instead of producing a swallowed guard failure.
const CANCELLABLE_SCHEDULE_STATUSES = new Set([
  "PENDING",
  "IN_PROGRESS",
  "PAUSED",
]);

const defaultDiagnostic = (
  diag: InvoiceWrittenOffRevRecCancelDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[invoice-writeoff-revrec:${diag.stage}] ${diag.reason}`, {
    invoiceId: diag.invoiceId,
    scheduleId: diag.scheduleId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createInvoiceWrittenOffRevRecCancelMiddleware(
  options: InvoiceWrittenOffRevRecCancelMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const writtenOffEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "InvoiceWrittenOff" &&
          ctx.entityName === "Invoice" &&
          ctx.command.name === "writeOff"
      );

      for (const event of writtenOffEvents) {
        const payload = event.payload as
          | { reason?: unknown; tenantId?: unknown }
          | undefined;
        const invoiceId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(invoiceId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `InvoiceWrittenOff missing ${invoiceId ? "tenantId" : "invoiceId"}`,
            invoiceId,
            tenantId,
          });
          continue;
        }

        const scheduleStore = storeProvider("RevenueRecognitionSchedule");
        if (!scheduleStore) {
          onDiagnostic({
            stage: "stores",
            reason:
              "RevenueRecognitionSchedule store unavailable — schedules not cancelled",
            invoiceId,
            tenantId,
          });
          continue;
        }

        // 1:N: an invoice may have multiple recognition schedules. Cancel every
        // cancellable one tied to this invoice; COMPLETED/CANCELLED are left alone.
        const schedules = (await scheduleStore.getAll())
          .map((row) => row as RevenueScheduleLike)
          .filter(
            (row) =>
              asNonEmptyString(row.tenantId) === tenantId &&
              asNonEmptyString(row.invoiceId) === invoiceId
          );

        const cancellable = schedules.filter((row) => {
          const status = asNonEmptyString(row.status);
          return status != null && CANCELLABLE_SCHEDULE_STATUSES.has(status);
        });

        if (cancellable.length === 0) {
          onDiagnostic({
            stage: "no-schedules",
            reason:
              "no cancellable revenue-recognition schedules for written-off invoice — nothing to cancel",
            invoiceId,
            tenantId,
            detail: { matched: schedules.length },
          });
          continue;
        }

        // `reason` IS a writeOff input param, so it rides the payload; forward it
        // to cancel so the schedule's audit trail records WHY it was cancelled.
        const reason =
          asNonEmptyString(payload?.reason) ?? "Invoice written off";

        let cancelledCount = 0;
        for (const schedule of cancellable) {
          const scheduleId = asNonEmptyString(schedule.id);
          if (!scheduleId) {
            onDiagnostic({
              stage: "schedule-id",
              reason: "matched schedule has no id — skipping",
              invoiceId,
              tenantId,
            });
            continue;
          }

          const result = await dispatchCommand(
            "cancel",
            {
              // cancel is a MUTATE on the existing schedule. The target id is
              // supplied BOTH in the body (`id`) AND as `instanceId` so the
              // write-back persists to the right row regardless of which the engine
              // keys persistence on (same shape as the sibling finance middleware).
              id: scheduleId,
              tenantId,
              reason,
            },
            {
              entityName: "RevenueRecognitionSchedule",
              instanceId: scheduleId,
              correlationId:
                asNonEmptyString(
                  (ctx as { correlationId?: unknown }).correlationId
                ) ?? invoiceId,
              causationId: "InvoiceWrittenOff",
              idempotencyKey: `invoice-writeoff-revrec:${tenantId}:${scheduleId}:cancel`,
            }
          );
          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "cancel",
              reason: `RevenueRecognitionSchedule.cancel failed: ${result.error ?? "unknown"}`,
              invoiceId,
              scheduleId,
              tenantId,
            });
            continue;
          }
          cancelledCount += 1;
        }

        onDiagnostic({
          stage: "done",
          reason: `cancelled ${cancelledCount} revenue-recognition schedule(s) for written-off invoice`,
          invoiceId,
          tenantId,
          detail: { cancelledCount, cancellable: cancellable.length },
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
