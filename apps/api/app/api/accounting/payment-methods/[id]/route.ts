/**
 * Single Payment Method API Routes
 *
 * GET    /api/accounting/payment-methods/[id]  - Get payment method (Prisma read)
 * PUT    /api/accounting/payment-methods/[id]  - Update payment method (Manifest runtime)
 * PATCH  /api/accounting/payment-methods/[id]  - Command actions (Manifest runtime)
 * DELETE /api/accounting/payment-methods/[id]  - Remove payment method (Manifest runtime)
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import {
  getDisplayInfo,
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
    captureException(error);
    log.error("Error fetching payment method", { error });
    return NextResponse.json(
      { error: "Failed to fetch payment method" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/payment-methods/[id]
 * Update a payment method via Manifest runtime.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

    // Pre-validation: check existence and access
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

    // Pre-validation: if setting as default, unset other defaults for this client
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

    const user = await resolveCurrentUser(request);
    return runManifestCommand({
      entity: "PaymentMethod",
      command: "update",
      body: {
        id,
        cardLastFour: body.cardLastFour ?? paymentMethod.cardLastFour ?? "",
        cardNetwork: body.cardNetwork ?? paymentMethod.cardNetwork ?? "",
        isDefault: body.isDefault ?? paymentMethod.isDefault,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    log.error("Error updating payment method", { error });
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/payment-methods/[id]
 * Handle payment method command actions via Manifest runtime.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

    // Pre-validation: check existence and access
    const paymentMethod = await database.paymentMethod.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    validatePaymentMethodAccess(paymentMethod, tenantId);

    const user = await resolveCurrentUser(request);
    const action = body.action;

    // Map HTTP actions to Manifest commands
    const commandMap: Record<string, { command: string; body: Record<string, unknown> }> = {
      "mark-as-default": { command: "markAsDefault", body: { id } },
      "verify": { command: "verify", body: { id, method: body.method || "manual" } },
      "flag-for-fraud": { command: "flagForFraud", body: { id, reason: body.reason || "" } },
      "mark-expired": { command: "markExpired", body: { id } },
      "remove": { command: "remove", body: { id } },
    };

    const mapped = commandMap[action];
    if (!mapped) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Pre-validation for mark-as-default: unset other defaults for this client
    if (action === "mark-as-default") {
      await database.paymentMethod.updateMany({
        where: {
          tenantId,
          clientId: paymentMethod.clientId,
          id: { not: id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return runManifestCommand({
      entity: "PaymentMethod",
      command: mapped.command,
      body: mapped.body,
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    log.error("Error handling payment method action", { error });
    return NextResponse.json(
      { error: "Failed to handle payment method action" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/payment-methods/[id]
 * Remove (soft delete) a payment method via Manifest runtime.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    // Pre-validation: check existence and access
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

    const user = await resolveCurrentUser(request);
    return runManifestCommand({
      entity: "PaymentMethod",
      command: "remove",
      body: { id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    log.error("Error deleting payment method", { error });
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
