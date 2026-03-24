/**
 * Payment Methods API Routes
 *
 * Handles payment method storage and management.
 *
 * NOTE: The Prisma PaymentMethod model has been simplified to:
 * - tenantId, id, clientId, type, cardLastFour, cardNetwork, isDefault
 * - createdAt, updatedAt, deletedAt
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  getDisplayInfo,
  type PaymentMethodListResponse,
  type PaymentMethodResponse,
  parsePaginationParams,
  parsePaymentMethodFilters,
  validateCreatePaymentMethodRequest,
} from "./validation";

/**
 * GET /api/accounting/payment-methods
 * List all payment methods with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const filters = parsePaymentMethodFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause - only use fields that exist in the schema
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    // Note: search filter removed since nickname, cardHolderName, bankAccountLastFour, walletEmail don't exist

    // Get payment methods
    const [paymentMethods, totalCount] = await Promise.all([
      database.paymentMethod.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDirection },
      }),
      database.paymentMethod.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json<PaymentMethodListResponse>({
      data: paymentMethods.map((pm) => ({
        ...pm,
        displayInfo: getDisplayInfo(pm),
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing payment methods:", error);
    return NextResponse.json(
      { error: "Failed to list payment methods" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/payment-methods
 * Create a new payment method
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await request.json();

    validateCreatePaymentMethodRequest(body);

    // Verify client exists and belongs to tenant
    const client = await database.client.findFirst({
      where: {
        tenantId,
        id: body.clientId,
        deletedAt: null,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // If setting as default, unset other defaults for this client
    if (body.isDefault) {
      await database.paymentMethod.updateMany({
        where: {
          tenantId,
          clientId: body.clientId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create payment method - only use fields that exist in the schema
    const paymentMethod = await database.paymentMethod.create({
      data: {
        tenantId,
        clientId: body.clientId,
        type: body.type,
        cardLastFour: body.cardLastFour || null,
        cardNetwork: body.cardNetwork || null,
        isDefault: body.isDefault || false,
      },
    });

    const response: PaymentMethodResponse = {
      ...paymentMethod,
      displayInfo: getDisplayInfo(paymentMethod),
    };

    return NextResponse.json<PaymentMethodResponse>(response, { status: 201 });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}
