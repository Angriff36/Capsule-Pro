/**
 * Single Payment Method API Routes
 *
 * Handles operations on individual payment methods
 */

import { db } from "@capsule-db";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/app/lib/tenant";
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
    const tenantId = await getTenantId();
    const { id } = await context.params;

    const paymentMethod = await db.paymentMethod.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
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

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    const response = {
      ...paymentMethod,
      displayInfo: getDisplayInfo(paymentMethod),
      isExpired: isCardExpired(
        paymentMethod.cardExpiryMonth,
        paymentMethod.cardExpiryYear
      ),
      isUsable: isPaymentMethodUsable(paymentMethod),
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
    const tenantId = await getTenantId();
    const { id } = await context.params;
    const body = await request.json();

    const paymentMethod = await db.paymentMethod.findFirst({
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
      await db.paymentMethod.updateMany({
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

    // Update allowed fields only
    const allowedFields = [
      "nickname",
      "isDefault",
      "metadata",
      "externalMethodId",
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updatedPaymentMethod = await db.paymentMethod.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
      include: {
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

    const response = {
      ...updatedPaymentMethod,
      displayInfo: getDisplayInfo(updatedPaymentMethod),
      isExpired: isCardExpired(
        updatedPaymentMethod.cardExpiryMonth,
        updatedPaymentMethod.cardExpiryYear
      ),
      isUsable: isPaymentMethodUsable(updatedPaymentMethod),
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
 * Delete (invalidate) a payment method
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await getTenantId();
    const { id } = await context.params;

    const paymentMethod = await db.paymentMethod.findFirst({
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

    // Don't allow deletion of default payment method if there are other methods
    if (paymentMethod.isDefault) {
      const otherMethodsCount = await db.paymentMethod.count({
        where: {
          tenantId,
          clientId: paymentMethod.clientId,
          id: { not: id },
          status: "ACTIVE",
          deletedAt: null,
        },
      });

      if (otherMethodsCount > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot delete default payment method. Set another as default first.",
          },
          { status: 400 }
        );
      }
    }

    // Soft delete by marking as invalid
    await db.paymentMethod.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        status: "INVALID",
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

/**
 * POST /api/accounting/payment-methods/[id]/verify
 * Verify a payment method
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await getTenantId();
    const { id } = await context.params;
    const body = await request.json();

    const paymentMethod = await db.paymentMethod.findFirst({
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

    const verificationMethod = body.method || "manual";

    // In a real implementation, this would call the payment gateway
    // to verify the payment method (e.g., micro-deposit for ACH, CVV check for cards)

    // For now, mark as verified
    const updatedPaymentMethod = await db.paymentMethod.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        verifiedAt: new Date(),
        verificationMethod,
      },
    });

    const response = {
      ...updatedPaymentMethod,
      displayInfo: getDisplayInfo(updatedPaymentMethod),
      isExpired: isCardExpired(
        updatedPaymentMethod.cardExpiryMonth,
        updatedPaymentMethod.cardExpiryYear
      ),
      isUsable: isPaymentMethodUsable(updatedPaymentMethod),
    };

    return NextResponse.json<PaymentMethodResponse>(response);
  } catch (error) {
    console.error("Error verifying payment method:", error);
    return NextResponse.json(
      { error: "Failed to verify payment method" },
      { status: 500 }
    );
  }
}
