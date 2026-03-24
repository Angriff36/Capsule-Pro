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
    const isFullRefund = body.amount >= paymentAmount;

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

        await database.invoice.update({
          where: {
            tenantId_id: {
              tenantId,
              id: payment.invoiceId,
            },
          },
          data: {
            amountPaid: currentAmountPaid - body.amount,
            amountDue: currentAmountDue + body.amount,
          },
        });
      }
    }

    return NextResponse.json<PaymentResponse>({
      ...updatedPayment,
      amount: updatedPayment.amount.toString(),
    });
  } catch (error) {
    console.error("Error refunding payment:", error);
    return NextResponse.json(
      { error: "Failed to refund payment" },
      { status: 500 }
    );
  }
}
