/**
 * Single Payment Method API Routes
 *
 * Handles operations on individual payment methods.
 *
 * NOTE: The Prisma PaymentMethod model has been simplified to:
 * - tenantId, id, clientId, type, cardLastFour, cardNetwork, isDefault
 * - createdAt, updatedAt, deletedAt
 *
 * Many fields referenced in this file (cardExpiryMonth, cardExpiryYear, status, etc.)
 * do not exist in the current schema.
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  getDisplayInfo,
  isCardExpired,
  isPaymentMethodUsable,
  type PaymentMethodResponse,
  validatePaymentMethodAccess,
} from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/accounting/payment-methods/[id]
 * Get a single payment method by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const paymentMethod = await database.paymentMethod.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    const response: PaymentMethodResponse = {
      ...paymentMethod,
      displayInfo: getDisplayInfo(paymentMethod),
    };

    return NextResponse.json<PaymentMethodResponse>(response);
  } catch (error) {
    console.error("Error fetching payment method:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment method" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/payment-methods/[id]
 * Update a payment method
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

    const paymentMethod = await database.paymentMethod.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    validatePaymentMethodAccess(paymentMethod, tenantId);

    // If setting as default, unset other defaults for this client
    if (body.isDefault === true) {
      await database.paymentMethod.updateMany({
        where: {
          tenantId,
          clientId: paymentMethod.clientId,
          id: { not: id },
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update allowed fields only - only fields that exist in the schema
    const updateData: Record<string, unknown> = {};
    if (body.cardLastFour !== undefined) {
      updateData.cardLastFour = body.cardLastFour;
    }
    if (body.cardNetwork !== undefined) {
      updateData.cardNetwork = body.cardNetwork;
    }
    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault;
    }

    const updatedPaymentMethod = await database.paymentMethod.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    const response: PaymentMethodResponse = {
      ...updatedPaymentMethod,
      displayInfo: getDisplayInfo(updatedPaymentMethod),
    };

    return NextResponse.json<PaymentMethodResponse>(response);
  } catch (error) {
    console.error("Error updating payment method:", error);
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/payment-methods/[id]
 * Delete (soft delete) a payment method
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const paymentMethod = await database.paymentMethod.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    validatePaymentMethodAccess(paymentMethod, tenantId);

    // Soft delete
    await database.paymentMethod.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
