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
import {
  captureException,
  type PaymentResponse,
  validatePaymentAccess,
  validatePaymentBusinessRules,
  validateRefundRequest,
} from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/payments/[id]/process
 * Process a payment through gateway
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

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

    // Process payment (in real implementation, this would call the payment gateway)
    const gatewayResponse = body.gatewayResponse || {
      code: "200",
      message: "Success",
      transactionId: `txn_${Date.now()}`,
    };

    const isCompleted =
      gatewayResponse.code === "200" || gatewayResponse.code === "1";

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
        gatewayTransactionId: gatewayResponse.transactionId,
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
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
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
    console.error("Error refunding payment:", error);
    return NextResponse.json(
      { error: "Failed to refund payment" },
      { status: 500 }
    );
  }
}
