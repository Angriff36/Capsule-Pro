/**
 * Single Payment API Routes
 *
 * Handles operations on individual payments
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  type PaymentResponse,
  validateFraudStatusUpdate,
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
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json<PaymentResponse>(payment);
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
        processorResponseCode: gatewayResponse.code,
        processorResponseMessage: gatewayResponse.message,
      },
    });

    // If payment completed, update invoice
    if (isCompleted) {
      await database.invoice.update({
        where: {
          tenantId_id: {
            tenantId,
            id: payment.invoiceId,
          },
        },
        data: {
          amountPaid: {
            increment: payment.amount,
          },
          amountDue: {
            decrement: payment.amount,
          },
          ...(Math.abs((payment.invoiceId ? 0 : 0) - payment.amount) < 0.01
            ? {
                status: "PAID",
                paidAt: new Date(),
              }
            : {
                status: "PARTIALLY_PAID",
              }),
        },
      });
    }

    return NextResponse.json<PaymentResponse>(
      updatedPayment as PaymentResponse
    );
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

    const isFullRefund = body.amount >= payment.amount;

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
        description: body.reason,
      },
    });

    // Update invoice to reflect refund
    await database.invoice.update({
      where: {
        tenantId_id: {
          tenantId,
          id: payment.invoiceId,
        },
      },
      data: {
        amountPaid: {
          decrement: body.amount,
        },
        amountDue: {
          increment: body.amount,
        },
      },
    });

    return NextResponse.json<PaymentResponse>(
      updatedPayment as PaymentResponse
    );
  } catch (error) {
    console.error("Error refunding payment:", error);
    return NextResponse.json(
      { error: "Failed to refund payment" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/payments/[id]/fraud
 * Update fraud status
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

    validateFraudStatusUpdate(body);

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

    // Update fraud status
    const updatedPayment = await database.payment.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        fraudStatus: body.status,
        fraudScore: body.score,
        fraudReasons: body.reasons,
        ...(body.status === "FAILED" ? { status: "FAILED" } : {}),
      },
    });

    return NextResponse.json<PaymentResponse>(
      updatedPayment as PaymentResponse
    );
  } catch (error) {
    console.error("Error updating fraud status:", error);
    return NextResponse.json(
      { error: "Failed to update fraud status" },
      { status: 500 }
    );
  }
}
