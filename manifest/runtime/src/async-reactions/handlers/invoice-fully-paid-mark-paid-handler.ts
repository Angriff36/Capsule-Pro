/**
 * Async reaction handler for invoice fully-paid → markAsPaid.
 *
 * Deferred counterpart of {@link createInvoiceFullyPaidMarkPaidMiddleware}.
 * When `PaymentApplied` fires (emitted by `Invoice.applyPayment`), the
 * middleware (with async enabled) ENQUEUES a job; this handler runs LATER in
 * the worker, loads the post-mutation Invoice, and — when `amountDue <= 0` and
 * `status != "PAID"` — dispatches the governed `Invoice.markAsPaid` to close
 * the AR loop. (`applyPayment` unconditionally sets `PARTIALLY_PAID` even when
 * the balance reaches zero, so fully-settled invoices would otherwise strand at
 * PARTIALLY_PAID with `amountDue = 0` — never reaching PAID.)
 *
 * Loop-safe (the important subtlety): `markAsPaid` ALSO emits `PaymentApplied`.
 * In the synchronous middleware this is handled by scoping to
 * `command.name === "applyPayment"`. In the async path the producer side
 * (capture-triggering-events) must scope the enqueue to `applyPayment`-emitted
 * `PaymentApplied` events — the handler itself does not see the originating
 * command name. Belt-and-suspenders: this handler also skips when
 * `status == "PAID"`, so a stray re-emit is a clean no-op rather than a
 * rejected PAID → PAID self-transition, and a stable idempotency key dedups.
 *
 * Quiet on the common path: a partial payment (`amountDue > 0`) is the dominant
 * expected outcome — no action, no warning (warning on every partial payment
 * would be log spam). Genuine anomalies (missing invoice, non-numeric
 * `amountDue`, dispatch failure) and the close action itself ARE surfaced
 * via `log`.
 *
 * Idempotent: per (tenant, invoice) —
 * `invoice-fully-paid:${tenantId}:${invoiceId}`.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const INVOICE_FULLY_PAID_MARK_PAID_REACTION = "invoiceFullyPaidMarkPaid";

interface InvoiceRow {
  amountDue?: unknown;
  status?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const invoiceFullyPaidMarkPaidHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const invoiceId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;

  if (!invoiceId) {
    log.warn?.("invoiceFullyPaidMarkPaid: missing subjectId — skipping", {
      jobId: job.id,
    });
    return;
  }

  const invoiceStore = storeProvider("Invoice") as ManifestStore | undefined;
  if (!invoiceStore) {
    throw new Error("Invoice store unavailable");
  }

  const invoice = (await invoiceStore.getById(invoiceId)) as
    | InvoiceRow
    | undefined;
  if (!invoice) {
    throw new Error(`Invoice not found in store: ${invoiceId}`);
  }

  const status = asNonEmptyString(invoice.status);
  // Already closed (incl. the markAsPaid re-emit path) — nothing to do, and a
  // markAsPaid dispatch here would be a rejected PAID → PAID no-op
  // self-transition.
  if (status === "PAID") {
    return;
  }

  const amountDue = asFiniteNumber(invoice.amountDue);
  if (amountDue === undefined) {
    log.warn?.("invoiceFullyPaidMarkPaid: amountDue not numeric — skip", {
      jobId: job.id,
      invoiceId,
      amountDue: invoice.amountDue,
    });
    return;
  }

  // The common, expected case: balance remains. No action, no diagnostic.
  if (amountDue > 0) {
    return;
  }

  // Balance is settled (== 0; <= 0 is defensive) and the invoice is not yet PAID.
  const result = await dispatchCommand(
    "markAsPaid",
    {
      // markAsPaid() is a MUTATE on the existing Invoice. Supply the target id
      // BOTH in the body (`id`) AND as `instanceId` so the write-back persists
      // to the right row regardless of which the engine keys persistence on
      // (same shape as the synchronous middleware).
      id: invoiceId,
      tenantId,
    },
    {
      entityName: "Invoice",
      instanceId: invoiceId,
      correlationId: invoiceId,
      causationId: "PaymentApplied",
      idempotencyKey:
        job.idempotencyKey ?? `invoice-fully-paid:${tenantId}:${invoiceId}`,
    }
  );

  if (!result.success) {
    throw new Error(
      `Invoice.markAsPaid failed for ${invoiceId}: ${result.error ?? "unknown"}`
    );
  }
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // money fields may surface as strings from some stores.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
