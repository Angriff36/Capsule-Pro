/**
 * Payment Methods API Routes
 *
 * GET  /api/accounting/payment-methods        - List payment methods (Prisma read)
 * POST /api/accounting/payment-methods        - Create payment method (Manifest runtime)
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import {
  clearSiblingDefaults,
  getDisplayInfo,
  type PaymentMethodListResponse,
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
    captureException(error);
    log.error("Error listing payment methods:", error);
    return NextResponse.json(
      { error: "Failed to list payment methods" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/payment-methods
 * Create a new payment method via Manifest runtime.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = (await request.json()) as Record<string, unknown>;

    validateCreatePaymentMethodRequest(body);

    // Pre-validation: verify client exists and belongs to tenant (constitution §10)
    const client = await database.client.findFirst({
      where: {
        tenantId,
        id: body.clientId as string,
        deletedAt: null,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const user = await resolveCurrentUser(request);

    // Governed: if setting as default, clear sibling defaults via Manifest runtime
    if (body.isDefault) {
      await clearSiblingDefaults(tenantId, body.clientId as string, "", {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      });
    }

    return runManifestCommand({
      entity: "PaymentMethod",
      command: "create",
      body: {
        clientId: body.clientId,
        type: body.type,
        externalMethodId: body.externalMethodId ?? "",
        cardLastFour: body.cardLastFour ?? "",
        cardNetwork: body.cardNetwork ?? "",
        cardExpiryMonth: body.cardExpiryMonth ?? 0,
        cardExpiryYear: body.cardExpiryYear ?? 0,
        cardHolderName: body.cardHolderName ?? "",
        bankAccountLastFour: body.bankAccountLastFour ?? "",
        bankAccountType: body.bankAccountType ?? "",
        bankRoutingNumber: body.bankRoutingNumber ?? "",
        walletProvider: body.walletProvider ?? "",
        walletEmail: body.walletEmail ?? "",
        nickname: body.nickname ?? "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    log.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}
