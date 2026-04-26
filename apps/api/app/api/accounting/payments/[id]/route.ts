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
import { checkSensitiveTenantRateLimit } from "@/lib/sensitive-rate-limit";
import { processPaymentGateway } from "../gateway";
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
    const rateLimited = await checkSensitiveTenantRateLimit(request, tenantId);
    if (rateLimited) {
      return rateLimited;
    }
    const { id } = await context.params;

    // Intentionally NOT reading `gatewayResponse` from the request body.
    // The gateway outcome is the system of record for whether a charge
    // actually happened; trusting a client-supplied response would let any
    // authenticated tenant caller mark a PENDING payment as COMPLETED by
    // sending `{ gatewayResponse: { code: "200" } }` and forge a phantom
    // invoice credit. See `apps/api/app/api/accounting/payments/gateway.ts`
    // for the security invariant.

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

    // Server-side gateway dispatch. Replace the body of `processPaymentGateway`
    // with a real Stripe call from `packages/payments` once the integration
    // is wired up; the route does not need to change.
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
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const rateLimited = await checkSensitiveTenantRateLimit(request, tenantId);
    if (rateLimited) {
      return rateLimited;
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
    // Clamp refund at payment amount to prevent invoice over-credit when a
    // caller supplies an amount larger than what was actually charged.
    const effectiveRefund = Math.min(Number(body.amount), paymentAmount);
    const isFullRefund = effectiveRefund >= paymentAmount;

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

    // Update invoice to reflect refund
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

        // Re-derive invoice payment status after the refund so a previously
        // PAID invoice does not stay PAID once money has flowed back out.
        // - newAmountPaid <= 0  → SENT (no payments remain on the invoice)
        // - otherwise           → PARTIALLY_PAID
        // We do NOT downgrade DRAFT/VOID/CANCELLED invoices here; refunds are
        // only valid against COMPLETED payments which can only attach to
        // invoices that were sent.
        const invoiceStatus = newAmountPaid <= 0.01 ? "SENT" : "PARTIALLY_PAID";

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
            status: invoiceStatus,
            // Clear paidAt when the invoice is no longer fully paid.
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
