/**
 * Async reaction handler for payment processing → invoice application.
 *
 * Deferred counterpart of {@link createPaymentProcessedInvoiceApplyMiddleware}.
 * When `PaymentProcessed` fires, the middleware (with async enabled) ENQUEUES a
 * job; this handler runs LATER in the worker, loads the processed Payment for
 * its own fields (`invoiceId` / `amount` / `status` — NOT reachable from the
 * declared event payload), and dispatches the governed `Invoice.applyPayment`.
 *
 * The load + filter + dispatch logic is identical to the synchronous middleware
 * (same guard-safe checks: status COMPLETED, invoice in an applicable status,
 * no over-payment). It is duplicated here rather than shared because the
 * synchronous middleware reads `ctx.instanceId` / `ctx.runtimeContext` /
 * `ctx.correlationId`, while the async handler only has
 * {@link TriggeringEventPayload} + `job.tenantId` captured at enqueue time.
 *
 * Guard-safe + idempotent: skips DRAFT / PAID / VOID / WRITE_OFF invoices and
 * over-payments (the route then marks the payment `ACCEPTED_NOT_APPLIED`) rather
 * than producing a swallowed guard failure. Forwards
 * `payment-processed:${tenantId}:${paymentId}` so the governed dispatch dedups
 * a redelivered job.
 */

import { isMoneyGreaterThan } from "../../numeric-boundary";
import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const PAYMENT_PROCESSED_INVOICE_APPLY_REACTION =
  "paymentProcessedInvoiceApply";

// Invoice.applyPayment guards `self.status in [...]`; outside this set the
// command rejects (DRAFT not yet sent; PAID/VOID/WRITE_OFF terminal).
const APPLICABLE_INVOICE_STATUSES = new Set([
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PARTIALLY_PAID",
]);

interface PaymentRow {
  amount?: unknown;
  invoiceId?: unknown;
  status?: unknown;
}

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
export const paymentProcessedInvoiceApplyHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const paymentId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;

  if (!paymentId) {
    log.warn?.("paymentProcessedInvoiceApply: missing subjectId — skipping", {
      jobId: job.id,
    });
    return;
  }

  const paymentStore = storeProvider("Payment") as ManifestStore | undefined;
  const invoiceStore = storeProvider("Invoice") as ManifestStore | undefined;
  if (!(paymentStore && invoiceStore)) {
    throw new Error("Payment or Invoice store unavailable");
  }

  const payment = (await paymentStore.getById(paymentId)) as
    | PaymentRow
    | undefined;
  if (!payment) {
    throw new Error(`processed Payment not found in store: ${paymentId}`);
  }

  // Defensive: only a genuinely COMPLETED payment should credit an invoice.
  // `processFailed` ALSO emits PaymentProcessed (it sets status = FAILED); this
  // check excludes that path.
  const paymentStatus = asNonEmptyString(payment.status);
  if (paymentStatus !== "COMPLETED") {
    log.warn?.(
      "paymentProcessedInvoiceApply: payment not COMPLETED — skip apply",
      { jobId: job.id, paymentId, paymentStatus }
    );
    return;
  }

  const invoiceId = asNonEmptyString(payment.invoiceId);
  if (!invoiceId) {
    log.warn?.(
      "paymentProcessedInvoiceApply: payment has no invoiceId — nothing to credit",
      { jobId: job.id, paymentId }
    );
    return;
  }

  const amount = asFiniteNumber(payment.amount);
  if (!(amount && amount > 0)) {
    log.warn?.(
      "paymentProcessedInvoiceApply: payment amount not positive — skip apply",
      { jobId: job.id, paymentId, amount: payment.amount }
    );
    return;
  }

  // Guard-safe: mirror Invoice.applyPayment's guards so a skip is a clean
  // no-op (the route marks ACCEPTED_NOT_APPLIED) instead of a swallowed
  // guard failure.
  const invoice = (await invoiceStore.getById(invoiceId)) as
    | InvoiceRow
    | undefined;
  if (!invoice) {
    throw new Error(`linked Invoice not found in store: ${invoiceId}`);
  }

  const invoiceStatus = asNonEmptyString(invoice.status);
  if (!(invoiceStatus && APPLICABLE_INVOICE_STATUSES.has(invoiceStatus))) {
    log.warn?.(
      "paymentProcessedInvoiceApply: invoice not in an applicable status — skip apply",
      { jobId: job.id, paymentId, invoiceId, invoiceStatus }
    );
    return;
  }

  const amountDue = asFiniteNumber(invoice.amountDue) ?? 0;
  if (isMoneyGreaterThan(amount, amountDue)) {
    log.warn?.(
      "paymentProcessedInvoiceApply: payment exceeds amount due — skip apply",
      { jobId: job.id, paymentId, invoiceId, amount, amountDue }
    );
    return;
  }

  const result = await dispatchCommand(
    "applyPayment",
    {
      // applyPayment is a MUTATE on the existing Invoice. The target id is
      // supplied BOTH in the body (`id`) AND as `instanceId` so the
      // write-back persists to the right row regardless of which the engine
      // keys persistence on (same shape as the synchronous middleware).
      id: invoiceId,
      tenantId,
      paymentAmount: amount,
      paymentId,
    },
    {
      entityName: "Invoice",
      instanceId: invoiceId,
      correlationId: paymentId,
      causationId: "PaymentProcessed",
      idempotencyKey:
        job.idempotencyKey ?? `payment-processed:${tenantId}:${paymentId}`,
    }
  );

  if (!result.success) {
    throw new Error(
      `Invoice.applyPayment failed for ${invoiceId}: ${result.error ?? "unknown"}`
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
  // Payment.amount / Invoice.amountDue are `money` — stores may surface them as strings.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
