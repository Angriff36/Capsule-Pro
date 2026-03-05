/**
 * Payment Methods API Routes
 *
 * Handles payment method storage and management
 */

import { db } from "@capsule-db";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/app/lib/tenant";
import {
  getDisplayInfo,
  isCardExpired,
  isPaymentMethodUsable,
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
    const tenantId = await getTenantId();
    const { searchParams } = new URL(request.url);

    const filters = parsePaymentMethodFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
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

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    if (filters.fraudFlagged !== undefined) {
      where.fraudFlagged = filters.fraudFlagged;
    }

    if (filters.search) {
      where.OR = [
        { nickname: { contains: filters.search, mode: "insensitive" } },
        { cardHolderName: { contains: filters.search, mode: "insensitive" } },
        { cardLastFour: { contains: filters.search } },
        { bankAccountLastFour: { contains: filters.search } },
        { walletEmail: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Get payment methods with related data
    const [paymentMethods, totalCount] = await Promise.all([
      db.paymentMethod.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDirection },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      }),
      db.paymentMethod.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json<PaymentMethodListResponse>({
      data: paymentMethods.map((pm) => ({
        ...pm,
        clientName:
          pm.client?.company_name ||
          [pm.client?.first_name, pm.client?.last_name]
            .filter(Boolean)
            .join(" ") ||
          "",
        displayInfo: getDisplayInfo(pm),
        isExpired: isCardExpired(pm.cardExpiryMonth, pm.cardExpiryYear),
        isUsable: isPaymentMethodUsable(pm),
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
    const tenantId = await getTenantId();
    const body = await request.json();

    validateCreatePaymentMethodRequest(body);

    // Verify client exists and belongs to tenant
    const client = await db.client.findFirst({
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
      await db.paymentMethod.updateMany({
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

    // Create payment method
    const paymentMethod = await db.paymentMethod.create({
      data: {
        tenantId,
        clientId: body.clientId,
        externalMethodId: body.externalMethodId,
        type: body.type,
        cardLastFour: body.cardLastFour,
        cardNetwork: body.cardNetwork,
        cardExpiryMonth: body.cardExpiryMonth,
        cardExpiryYear: body.cardExpiryYear,
        cardHolderName: body.cardHolderName,
        bankAccountLastFour: body.bankAccountLastFour,
        bankAccountType: body.bankAccountType,
        walletProvider: body.walletProvider,
        walletEmail: body.walletEmail,
        nickname: body.nickname,
        metadata: body.metadata || {},
        isDefault: body.isDefault,
        status: "ACTIVE",
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

    const response = {
      ...paymentMethod,
      displayInfo: getDisplayInfo(paymentMethod),
      isExpired: isCardExpired(
        paymentMethod.cardExpiryMonth,
        paymentMethod.cardExpiryYear
      ),
      isUsable: isPaymentMethodUsable(paymentMethod),
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
