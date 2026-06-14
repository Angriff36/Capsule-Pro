/**
 * Payment-refunded → Invoice-recordRefund middleware.
 *
 * Completes the finance propagation "when a payment is refunded, record the refund
 * against its linked invoice" — the cascade that keeps an invoice's `amountPaid`/
 * `amountDue`/`status` consistent with refund reality (the symmetric counterpart of
 * `payment-processed-invoice-apply-middleware`).
 *
 * WHY this is middleware and not a reaction (the crux):
 * `Payment.refund(refundAmount, reason)` / `Payment.partialRefund(...)` are MUTATE
 * commands (`mutate status = "REFUNDED"`, …), so the engine's emitted payload is
 * `{ ...commandInput, result }` where `result` is the LAST mutate's scalar
 * (`description = reason`), NOT the Payment instance. The refund AMOUNT (`refundAmount`)
 * IS a command input param, so it travels in the payload — but the invoice to credit
 * is identified by `Payment.invoiceId`, the Payment's OWN field, which `refund` does
 * NOT take as a param, and declared event fields (`PaymentRefunded.invoiceId`) are
 * NEVER auto-populated from `self.*`. So the prior `on PaymentRefunded run
 * Invoice.recordRefund` reaction reading `resolve payload.result.invoiceId` (and
 * `paymentId: payload.result.id`) was a SILENT NO-OP: both refs `undefined` →
 * `Invoice.recordRefund` never resolved a target → reaction error logged-and-swallowed
 * → refunds debited the payment but never credited the invoice (the refund route
 * relies on this propagation; it does not credit the invoice itself). This middleware
 * instead LOADS the refunded Payment from the store (the engine-cleaner mechanism for
 * entity-owned fields), reads `self.invoiceId`, reads the authoritative `refundAmount`
 * from the command input, and dispatches the governed `Invoice.recordRefund`.
 *
 * Guard-safe + idempotent: only dispatches when the Payment carries an `invoiceId`,
 * the refund amount is positive, and the linked Invoice satisfies `recordRefund`'s
 * guards (`refundAmount <= self.amountPaid`). An invoice that was never credited
 * (amountPaid == 0) or a refund exceeding amountPaid is skipped rather than producing
 * a swallowed guard failure. An `idempotencyKey` per payment lets the runtime's
 * idempotency store dedup a re-emitted `PaymentRefunded`. Every skip and failure
 * reports through `onDiagnostic` — never silent.
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

export interface PaymentInvoiceRefundDiagnostic {
  detail?: Record<string, unknown>;
  invoiceId?: string;
  paymentId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface PaymentRefundedInvoiceRecordMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: PaymentInvoiceRefundDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface PaymentLike {
  invoiceId?: unknown;
}

interface InvoiceLike {
  amountPaid?: unknown;
}

// Both `refund` and `partialRefund` emit PaymentRefunded; either should record the
// refund against the invoice.
const REFUND_COMMANDS = new Set(["refund", "partialRefund"]);

const defaultDiagnostic = (diag: PaymentInvoiceRefundDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[payment-refund:${diag.stage}] ${diag.reason}`, {
    paymentId: diag.paymentId,
    invoiceId: diag.invoiceId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPaymentRefundedInvoiceRecordMiddleware(
  options: PaymentRefundedInvoiceRecordMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const refundEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PaymentRefunded" &&
          ctx.entityName === "Payment" &&
          REFUND_COMMANDS.has(ctx.command.name)
      );

      for (const event of refundEvents) {
        const payload = event.payload as
          | { refundAmount?: unknown; tenantId?: unknown }
          | undefined;
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
            reason: `PaymentRefunded missing ${paymentId ? "tenantId" : "paymentId"}`,
            paymentId,
            tenantId,
          });
          continue;
        }

        // refundAmount IS a command input param on refund/partialRefund, so it
        // travels in the emitted payload `{...commandInput, result}`. This is the
        // authoritative refund amount (the route clamps it to payment.amount).
        const refundAmount = asFiniteNumber(payload?.refundAmount);
        if (!(refundAmount && refundAmount > 0)) {
          onDiagnostic({
            stage: "amount",
            reason: `refund amount not positive (${String(payload?.refundAmount)}) — skip record`,
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
            reason: "Payment or Invoice store unavailable — refund not recorded",
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
            reason: "refunded payment not found in store — cannot record refund",
            paymentId,
            tenantId,
          });
          continue;
        }

        const invoiceId = asNonEmptyString(payment.invoiceId);
        if (!invoiceId) {
          onDiagnostic({
            stage: "invoiceId",
            reason: "refunded payment has no invoiceId — nothing to credit back",
            paymentId,
            tenantId,
          });
          continue;
        }

        // Guard-safe: mirror Invoice.recordRefund's `refundAmount <= self.amountPaid`
        // guard so a skip is a clean no-op (e.g. the payment was never applied to the
        // invoice) instead of a swallowed guard failure.
        const invoice = (await invoiceStore.getById(invoiceId)) as
          | InvoiceLike
          | undefined;
        if (!invoice) {
          onDiagnostic({
            stage: "invoice-load",
            reason: "linked invoice not found in store — cannot record refund",
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }
        const amountPaid = asFiniteNumber(invoice.amountPaid) ?? 0;
        if (refundAmount > amountPaid) {
          onDiagnostic({
            stage: "overrefund",
            reason: `refund amount ${refundAmount} exceeds invoice amountPaid ${amountPaid} — skip record`,
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "recordRefund",
          {
            // recordRefund is a MUTATE on the existing Invoice. The target id is
            // supplied BOTH in the body (`id`) AND as `instanceId` so the
            // write-back persists to the right row regardless of which the engine
            // keys persistence on (same shape as the apply/contract→event middleware).
            id: invoiceId,
            tenantId,
            refundAmount,
            paymentId,
          },
          {
            entityName: "Invoice",
            instanceId: invoiceId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? paymentId,
            causationId: "PaymentRefunded",
            idempotencyKey: `payment-invoice:${tenantId}:${paymentId}:refund`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "record",
            reason: `Invoice.recordRefund failed: ${result.error ?? "unknown"}`,
            paymentId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `recorded refund ${refundAmount} against invoice`,
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
  // Payment/Invoice money fields may surface from stores as strings.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
