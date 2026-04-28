/**
 * Single Payment API Routes
 *
 * Handles operations on individual payments
 *
 * NOTE: The Prisma Payment model has been simplified to:
 * - tenantId, id, amount, currency, status, methodType, invoiceId, eventId, clientId
 * - gatewayTransactionId, gatewayPaymentMethodId, processor
 * - processedAt, completedAt, refundedAt
 * - createdAt, updatedAt, deletedAt
 * - No relations (invoice, event, client) - only IDs
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { translatePrismaError } from "@/lib/prisma-error";
import { checkRateLimit } from "@/middleware/rate-limiter";
import {
  captureException,
  type PaymentResponse,
  validatePaymentAccess,
  validatePaymentBusinessRules,
  validateRefundRequest,
} from "../validation";
import { processPaymentGateway, refundPaymentGateway } from "./gateway";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Sensitive-mutation rate limit options for payment process/refund.
 *
 * The global limiter (apps/api/middleware/global-rate-limit.ts) caps every
 * authenticated request at 100/min/tenant. That cap is too generous for
 * money-moving operations: a leaked session can burn ~100 charge or refund
 * attempts before the global ceiling kicks in, which is more than enough to
 * empty an event's refund budget or hammer the processor into a fraud lock.
 *
 * 20 requests / 60s / (tenant + endpoint + identifier) is a tight cap that
 * still leaves headroom for legitimate human-driven flows (a busy ops user
 * processing a queue of receipts) but stops abusive scripts cold. The
 * `payments_sensitive` prefix keeps this counter isolated from the global
 * pool — exhausting the sensitive bucket does NOT block read traffic on the
 * same session, and exhausting the global pool does NOT pre-consume the
 * sensitive bucket.
 *
 * Failure mode: `checkRateLimit` already fails OPEN on Redis connection
 * errors (rate-limiter.ts:415), so an Upstash outage degrades to "global
 * limit only" rather than locking out all payment mutations.
 */
const SENSITIVE_RATE_LIMIT = {
  limit: 20,
  window: "1m",
  prefix: "payments_sensitive",
} as const;

/**
 * GET /api/accounting/payments/[id]
 * Get a single payment by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const payment = await database.payment.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json<PaymentResponse>({
      ...payment,
      amount: payment.amount.toString(),
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/payments/[id]/process
 * Process a payment through gateway.
 *
 * SECURITY INVARIANT — DO NOT REMOVE
 *
 * The outcome of this charge (COMPLETED vs FAILED) and the persisted
 * `gatewayTransactionId` are decided EXCLUSIVELY by `processPaymentGateway`.
 * The HTTP request body is intentionally NOT parsed in this handler.
 *
 * Historical bug: this handler used to read `body.gatewayResponse.code`
 * and treat `"200" || "1"` as a success signal, which let any
 * authenticated tenant client phantom-credit a PENDING payment and
 * cascade `invoice.amountPaid += payment.amount` to flip the invoice to
 * PAID with no real money moving. If you find yourself adding
 * `request.json()` back to this function, stop and read
 * `./gateway.ts` first.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();

    // Sensitive-mutation throttle. Runs BEFORE any DB read so abusive
    // callers cannot probe for valid payment IDs or burn DB capacity by
    // looping on the process endpoint. See SENSITIVE_RATE_LIMIT comment.
    const rateLimit = await checkRateLimit(
      request,
      tenantId,
      SENSITIVE_RATE_LIMIT
    );
    if (!rateLimit.success && rateLimit.response) {
      return rateLimit.response;
    }

    const { id } = await context.params;

    // Get payment
    const payment = await database.payment.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    validatePaymentAccess(payment, tenantId);
    validatePaymentBusinessRules(payment, "process");

    // Server-side gateway call. The result is authoritative — the body of
    // the request is NEVER consulted to decide success/failure or to
    // generate the transaction ID.
    const gatewayResult = await processPaymentGateway({
      paymentId: payment.id,
      tenantId,
      amount: Number(payment.amount),
      currency: payment.currency,
    });

    const isCompleted = gatewayResult.success;

    // Update payment status
    const updatedPayment = await database.payment.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        status: isCompleted ? "COMPLETED" : "FAILED",
        processedAt: new Date(),
        completedAt: isCompleted ? new Date() : null,
        gatewayTransactionId: gatewayResult.transactionId,
      },
    });

    // If payment completed, update invoice
    if (isCompleted && payment.invoiceId) {
      const invoice = await database.invoice.findFirst({
        where: {
          tenantId,
          id: payment.invoiceId,
          deletedAt: null,
        },
      });

      if (invoice) {
        const paymentAmount = Number(payment.amount);
        const currentAmountPaid = Number(invoice.amountPaid);
        const currentAmountDue = Number(invoice.amountDue);

        await database.invoice.update({
          where: {
            tenantId_id: {
              tenantId,
              id: payment.invoiceId,
            },
          },
          data: {
            amountPaid: currentAmountPaid + paymentAmount,
            amountDue: currentAmountDue - paymentAmount,
            status:
              Math.abs(currentAmountDue - paymentAmount) < 0.01
                ? "PAID"
                : "PARTIALLY_PAID",
            ...(Math.abs(currentAmountDue - paymentAmount) < 0.01
              ? { paidAt: new Date() }
              : {}),
          },
        });
      }
    }

    return NextResponse.json<PaymentResponse>({
      ...updatedPayment,
      amount: updatedPayment.amount.toString(),
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/payments/[id]/refund
 * Refund a payment
 *
 * SECURITY / LEDGER INVARIANTS:
 *  - The refund amount applied to the ledger MUST be clamped at payment.amount.
 *    A caller-supplied refund of $250 against a $100 payment MUST adjust the
 *    invoice by $100, not $250 — otherwise invoice.amountPaid goes negative
 *    and amountDue inflates beyond the contract total.
 *  - Pass status (REFUNDED vs PARTIALLY_REFUNDED) MUST be derived from the
 *    *clamped* effectiveRefund, never from the caller's body.amount.
 *  - Invoice.status MUST be re-derived after a refund. A fully-paid invoice
 *    that gets refunded must NOT remain "PAID" — it should fall back to
 *    "SENT" (no money on file) or "PARTIALLY_PAID" (some money still on
 *    file). paidAt MUST be cleared when the invoice is no longer paid.
 *  - Refund gateway is authoritative. `refundPaymentGateway` is called
 *    BEFORE any payment/invoice mutation; on `success: false` the handler
 *    returns 502 and performs NO mutations to payment or invoice rows. This
 *    keeps local ledger state in sync with the processor — a payment that
 *    is still COMPLETED on Stripe must remain COMPLETED here. The persisted
 *    refund transaction ID and the original charge transaction ID come
 *    from the database, NEVER from the request body.
 *  - Every refund gateway call (success OR failure) writes one row to
 *    `payment_refund_attempts`. This is an append-only forensic trail that
 *    captures the gateway-side `refundTransactionId` and `failureReason`
 *    that would otherwise be lost when the 502 closes the connection.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();

    // Sensitive-mutation throttle. Runs BEFORE we parse the body or touch
    // the DB so refund-spam cannot drive processor calls or generate
    // partial-refund noise on the original payment row. See
    // SENSITIVE_RATE_LIMIT comment.
    const rateLimit = await checkRateLimit(
      request,
      tenantId,
      SENSITIVE_RATE_LIMIT
    );
    if (!rateLimit.success && rateLimit.response) {
      return rateLimit.response;
    }

    const { id } = await context.params;
    const body = await request.json();

    validateRefundRequest(body);

    const payment = await database.payment.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    validatePaymentAccess(payment, tenantId);
    validatePaymentBusinessRules(payment, "refund");

    const paymentAmount = Number(payment.amount);
    // Clamp the refund at the payment amount. Callers can request larger
    // numbers (typo, double-click, abuse) but the ledger only ever sees the
    // capped value.
    const effectiveRefund = Math.min(Number(body.amount), paymentAmount);
    const isFullRefund = effectiveRefund >= paymentAmount - 0.005;

    // Server-side refund gateway call. Runs BEFORE any DB mutation. The
    // original charge transaction ID is sourced from the persisted payment
    // row (NEVER `body.refundTransactionId` or any other caller field) so
    // the processor can correlate the refund back to its charge. On gateway
    // failure we 502 and write nothing — the local payment must remain
    // COMPLETED to mirror the processor's state.
    const gatewayResult = await refundPaymentGateway({
      paymentId: payment.id,
      tenantId,
      amount: effectiveRefund,
      currency: payment.currency,
      reason: String(body.reason),
      originalGatewayTransactionId: payment.gatewayTransactionId,
    });

    // Persist a permanent audit row for EVERY refund gateway call — success
    // or failure. This is the forensic record that survives the 502 closing
    // the user's connection on failure, and the only ledger of partial
    // refunds against a single payment over time.
    //
    // The write is best-effort: if the audit insert fails (DB outage, RLS
    // misconfiguration), we log via Sentry and continue. We do NOT roll back
    // the gateway-side money movement because the audit row was unavailable.
    // The append-only RLS policy ensures these rows can never be tampered
    // with after the fact.
    try {
      await database.paymentRefundAttempt.create({
        data: {
          tenantId,
          paymentId: payment.id,
          requestedAmount: Number(body.amount),
          effectiveAmount: effectiveRefund,
          refundReason: String(body.reason),
          originalGatewayTransactionId: payment.gatewayTransactionId,
          refundTransactionId: gatewayResult.refundTransactionId,
          success: gatewayResult.success,
          failureReason: gatewayResult.failureReason ?? null,
        },
      });
    } catch (auditError) {
      captureException(auditError);
      console.error(
        "Failed to persist payment refund audit row (continuing):",
        auditError
      );
    }

    if (!gatewayResult.success) {
      return NextResponse.json(
        {
          error: "Refund gateway rejected the refund",
          failureReason: gatewayResult.failureReason,
          refundTransactionId: gatewayResult.refundTransactionId,
        },
        { status: 502 }
      );
    }

    // Update payment
    const updatedPayment = await database.payment.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundedAt: new Date(),
      },
    });

    // Update invoice to reflect refund — re-derive status + paidAt from the
    // post-refund balance so a refunded invoice never stays marked PAID.
    if (payment.invoiceId) {
      const invoice = await database.invoice.findFirst({
        where: {
          tenantId,
          id: payment.invoiceId,
          deletedAt: null,
        },
      });

      if (invoice) {
        const currentAmountPaid = Number(invoice.amountPaid);
        const currentAmountDue = Number(invoice.amountDue);

        const newAmountPaid = currentAmountPaid - effectiveRefund;
        const newAmountDue = currentAmountDue + effectiveRefund;

        // Re-derive invoice status. If no money is left on file, fall back
        // to SENT (the pre-payment receivable state). If some money still
        // remains, the invoice is PARTIALLY_PAID. paidAt is cleared in both
        // cases because the invoice is no longer fully paid.
        const newStatus = newAmountPaid <= 0.01 ? "SENT" : "PARTIALLY_PAID";

        await database.invoice.update({
          where: {
            tenantId_id: {
              tenantId,
              id: payment.invoiceId,
            },
          },
          data: {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            paidAt: null,
          },
        });
      }
    }

    return NextResponse.json<PaymentResponse>({
      ...updatedPayment,
      amount: updatedPayment.amount.toString(),
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    console.error("Error refunding payment:", error);
    return NextResponse.json(
      { error: "Failed to refund payment" },
      { status: 500 }
    );
  }
}
