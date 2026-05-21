/**
 * Single Payment Method API Routes
 *
 * Handles operations on individual payment methods.
 *
 * Schema (see packages/database/prisma/schema.prisma model PaymentMethod):
 * - tenantId, id, clientId, type, cardLastFour, cardNetwork, isDefault, status
 * - createdAt, updatedAt, deletedAt
 *
 * `status` is a free-text column with values: ACTIVE | VERIFIED | FLAGGED |
 * EXPIRED. Card expiry month/year fields are NOT in the schema — do not
 * reintroduce references to them without a matching migration.
 *
 * MANIFEST GOVERNANCE STATUS — REAL VIOLATION, NOT AN ALIAS
 * ---------------------------------------------------------
 * Direct writes to `database.paymentMethod` here are constitution violations
 * (PaymentMethod is a governed entity per `manifest-registry/entities.json`).
 * Surfaced by `pnpm manifest:audit-direct-writes`. This route is NOT marked
 * as a `DEPRECATED ALIAS` — it is the original implementation.
 *
 * Per-action blockers (preventing safe migration in this pass):
 *
 *   - PUT /update:      Generic update path (cardLastFour, cardNetwork,
 *                       isDefault). Manifest has no generic `update` command;
 *                       only purpose-specific commands (markAsDefault,
 *                       markExpired, verify, flagForFraud, markInvalid,
 *                       updateToken). Migration would require new commands
 *                       or breaking the PUT contract.
 *   - mark-as-default:  Route runs `database.paymentMethod.updateMany` to
 *                       UNSET other defaults for the same client (multi-row
 *                       transactional concern), then sets this row.
 *                       Manifest `markAsDefault` is single-instance; cannot
 *                       atomically clear sibling defaults.
 *   - verify:           Manifest `verify(method)` REQUIRES a `method`
 *                       parameter; route's PATCH body doesn't pass one.
 *                       Migration would need a default or schema change.
 *                       Manifest mutates `verifiedAt` and `verificationMethod`
 *                       columns — route writes only `status="VERIFIED"`.
 *   - flag-for-fraud:   Route sets `status="FLAGGED"`; manifest `flagForFraud`
 *                       sets `status="FRAUDULENT"` AND `fraudFlagged=true`.
 *                       Status string differs → observable response change.
 *   - mark-expired:     Manifest `markExpired` ALSO sets `expiresAt=now()`
 *                       and guards `type in ["CREDIT_CARD","DEBIT_CARD"]`.
 *                       Route only sets `status="EXPIRED"`. New column write +
 *                       new guard = behavior change.
 *   - remove, DELETE:   Soft delete via `deletedAt=now()`. Manifest has no
 *                       softDelete command for PaymentMethod. Cannot migrate.
 *
 * Concrete migration path:
 *   1. Reconcile status values (FLAGGED vs FRAUDULENT) — decide which is
 *      canonical and update the other side. Either the manifest or callers
 *      will need to change, so coordinate with the frontend (apps/app).
 *   2. Add a `softDelete` command to the manifest, or accept that deletion
 *      stays as a bypass entry (with proper `whyRuntimeNotRequired`).
 *   3. Add a manifest command that allows the multi-row "clear other
 *      defaults" intent (e.g. `setDefault(clientId)` that runs as a service
 *      command across multiple rows). Until then, mark-as-default must
 *      retain its updateMany.
 *   4. Once 1–3 land, switch PATCH actions one by one to
 *      `runtime.runCommand(...)` and rewrite
 *      `payment-method-patch-actions.test.ts` against the new shape.
 *
 * Do not silence this finding by adding a `DEPRECATED ALIAS` marker. Until
 * the divergences above are addressed, this is a tracked violation.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
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
 * Handle payment method command actions
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

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

    const action = body.action;

    if (action === "mark-as-default") {
      // Unset other defaults for this client
      await database.paymentMethod.updateMany({
        where: {
          tenantId,
          clientId: paymentMethod.clientId,
          id: { not: id },
          isDefault: true,
        },
        data: { isDefault: false },
      });

      const updated = await database.paymentMethod.update({
        where: { tenantId_id: { tenantId, id } },
        data: { isDefault: true, updatedAt: new Date() },
      });

      const response: PaymentMethodResponse = {
        ...updated,
        displayInfo: getDisplayInfo(updated),
      };
      return NextResponse.json<PaymentMethodResponse>(response);
    }

    if (action === "verify") {
      const updated = await database.paymentMethod.update({
        where: { tenantId_id: { tenantId, id } },
        data: { status: "VERIFIED", updatedAt: new Date() },
      });

      const response: PaymentMethodResponse = {
        ...updated,
        displayInfo: getDisplayInfo(updated),
      };
      return NextResponse.json<PaymentMethodResponse>(response);
    }

    if (action === "flag-for-fraud") {
      const updated = await database.paymentMethod.update({
        where: { tenantId_id: { tenantId, id } },
        data: { status: "FLAGGED", updatedAt: new Date() },
      });

      const response: PaymentMethodResponse = {
        ...updated,
        displayInfo: getDisplayInfo(updated),
      };
      return NextResponse.json<PaymentMethodResponse>(response);
    }

    if (action === "mark-expired") {
      const updated = await database.paymentMethod.update({
        where: { tenantId_id: { tenantId, id } },
        data: { status: "EXPIRED", updatedAt: new Date() },
      });

      const response: PaymentMethodResponse = {
        ...updated,
        displayInfo: getDisplayInfo(updated),
      };
      return NextResponse.json<PaymentMethodResponse>(response);
    }

    if (action === "remove") {
      // Soft delete
      await database.paymentMethod.update({
        where: { tenantId_id: { tenantId, id } },
        data: { deletedAt: new Date() },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
    captureException(error);
    log.error("Error deleting payment method", { error });
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
