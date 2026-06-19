/**
 * Payment-processed → Invoice-applyPayment middleware.
 *
 * Completes the finance propagation "when a payment is processed, apply it to its
 * linked invoice" — the cascade that keeps an invoice's `amountPaid`/`amountDue`/
 * `status` consistent with payment reality.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `Payment.process` is a MUTATE command (`mutate status = "COMPLETED"`, …), so the
 * engine's emitted payload is `{ ...commandInput, result }` where `result` is the
 * LAST mutate's scalar (`gatewayTransactionId`), NOT the Payment instance. The
 * invoice to credit is identified by `Payment.invoiceId` and the credit amount by
 * `Payment.amount` — both the Payment's OWN fields, NOT `process` input params
 * (`process(gatewayTransactionId)`). Declared event fields (`PaymentProcessed.invoiceId`
 * / `.amount`) are NEVER auto-populated from `self.*`. So the prior
 * `on PaymentProcessed run Invoice.applyPayment` reaction reading
 * `payload.result.invoiceId` / `payload.result.amount` was a SILENT NO-OP: every ref
 * `undefined` → `Invoice.applyPayment`'s guards failed → reaction error
 * logged-and-swallowed → invoices were never credited (the payments route's
 * `status !== "DRAFT"` heuristic masked this for already-sent invoices, leaving
 * payments COMPLETED but invoices untouched). Reading `payload.invoiceId` would not
 * help — it is not a `process` param. This middleware instead LOADS the processed
 * Payment from the store (the engine-cleaner mechanism for entity-owned fields),
 * reads `self.invoiceId`/`self.amount`, and dispatches the governed
 * `Invoice.applyPayment`.
 *
 * Replaces the dormant `ProcessInvoicePayment` saga (removed in the same change): the
 * saga's `applyToInvoice` step + this middleware would double-apply on every
 * `PaymentProcessed` if both lived. The route's pre-existing `ACCEPTED_NOT_APPLIED`
 * fallback already covers the non-atomic failure case the saga's compensation aimed at.
 *
 * Guard-safe + idempotent: only dispatches when the Payment actually COMPLETED, it
 * carries an `invoiceId`, and the linked Invoice satisfies `applyPayment`'s guards
 * (status ∈ {SENT, VIEWED, OVERDUE, PARTIALLY_PAID} and 0 < amount <= amountDue). A
 * DRAFT/PAID invoice or an over-payment is skipped (the route then marks the payment
 * `ACCEPTED_NOT_APPLIED` for manual reconciliation) rather than producing a swallowed
 * guard failure. An `idempotencyKey` per payment lets the runtime's idempotency store
 * dedup a re-emitted `PaymentProcessed`. Every skip and failure reports through
 * `onDiagnostic` — never silent.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import { isMoneyGreaterThan } from "../numeric-boundary";

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

export interface PaymentInvoiceApplyDiagnostic {
  detail?: Record<string, unknown>;
  invoiceId?: string;
  paymentId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface PaymentProcessedInvoiceApplyMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: PaymentInvoiceApplyDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface PaymentLike {
  amount?: unknown;
  invoiceId?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

interface InvoiceLike {
  amountDue?: unknown;
  status?: unknown;
}

// Invoice.applyPayment guards `self.status in [...]`; outside this set the command
// rejects (DRAFT not yet sent; PAID/VOID/WRITE_OFF terminal).
const APPLICABLE_INVOICE_STATUSES = new Set([
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PARTIALLY_PAID",
]);

const defaultDiagnostic = (diag: PaymentInvoiceApplyDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[payment-invoice:${diag.stage}] ${diag.reason}`, {
    paymentId: diag.paymentId,
    invoiceId: diag.invoiceId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPaymentProcessedInvoiceApplyMiddleware(
  options: PaymentProcessedInvoiceApplyMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // `processFailed` ALSO emits PaymentProcessed (it sets status = FAILED); only
      // the `process` command represents a successful charge to apply.
      const processedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PaymentProcessed" &&
          ctx.entityName === "Payment" &&
          ctx.command.name === "process"
      );

      for (const event of processedEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const paymentId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(paymentId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `PaymentProcessed missing ${paymentId ? "tenantId" : "paymentId"}`,
            paymentId,
            tenantId,
          });
          continue;
        }

        const paymentStore = storeProvider("Payment");
        const invoiceStore = storeProvider("Invoice");
        if (!(paymentStore && invoiceStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "Payment or Invoice store unavailable — payment not applied",
            paymentId,
            tenantId,
            detail: { payment: !!paymentStore, invoice: !!invoiceStore },
          });
          continue;
        }

        const payment = (await paymentStore.getById(paymentId)) as
          | PaymentLike
          | undefined;
        if (!payment) {
          onDiagnostic({
            stage: "load",
            reason: "processed payment not found in store — cannot apply",
            paymentId,
            tenantId,
          });
          continue;
        }

        // Defensive: only a genuinely COMPLETED payment should credit an invoice.
        const paymentStatus = asNonEmptyString(payment.status);
        if (paymentStatus !== "COMPLETED") {
          onDiagnostic({
            stage: "status",
            reason: `payment not COMPLETED (status="${paymentStatus ?? "?"}") — skip apply`,
            paymentId,
            tenantId,
          });
          continue;
        }

        const invoiceId = asNonEmptyString(payment.invoiceId);
        if (!invoiceId) {
          onDiagnostic({
            stage: "invoiceId",
            reason: "processed payment has no invoiceId — nothing to credit",
            paymentId,
            tenantId,
          });
          continue;
        }

        const amount = asFiniteNumber(payment.amount);
        if (!(amount && amount > 0)) {
          onDiagnostic({
            stage: "amount",
            reason: `payment amount not positive (${String(payment.amount)}) — skip apply`,
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        // Guard-safe: mirror Invoice.applyPayment's guards so a skip is a clean
        // no-op (the route marks ACCEPTED_NOT_APPLIED) instead of a swallowed
        // guard failure.
        const invoice = (await invoiceStore.getById(invoiceId)) as
          | InvoiceLike
          | undefined;
        if (!invoice) {
          onDiagnostic({
            stage: "invoice-load",
            reason: "linked invoice not found in store — cannot apply",
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }
        const invoiceStatus = asNonEmptyString(invoice.status);
        if (!(invoiceStatus && APPLICABLE_INVOICE_STATUSES.has(invoiceStatus))) {
          onDiagnostic({
            stage: "invoice-status",
            reason: `invoice not in an applicable status (status="${invoiceStatus ?? "?"}") — skip apply`,
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }
        const amountDue = asFiniteNumber(invoice.amountDue) ?? 0;
        if (isMoneyGreaterThan(amount, amountDue)) {
          onDiagnostic({
            stage: "overpay",
            reason: `payment amount ${amount} exceeds amount due ${amountDue} — skip apply`,
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "applyPayment",
          {
            // applyPayment is a MUTATE on the existing Invoice. The target id is
            // supplied BOTH in the body (`id`) AND as `instanceId` so the
            // write-back persists to the right row regardless of which the engine
            // keys persistence on (same shape as the contract→event middleware).
            id: invoiceId,
            tenantId,
            paymentAmount: amount,
            paymentId,
          },
          {
            entityName: "Invoice",
            instanceId: invoiceId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? paymentId,
            causationId: "PaymentProcessed",
            idempotencyKey: `payment-invoice:${tenantId}:${paymentId}:apply`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "apply",
            reason: `Invoice.applyPayment failed: ${result.error ?? "unknown"}`,
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `applied payment ${amount} to invoice`,
          paymentId,
          invoiceId,
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
