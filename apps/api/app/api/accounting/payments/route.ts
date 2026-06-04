/**
 * Payments API Routes
 *
 * Handles payment processing and refunds.
 *
 * NOTE: The Prisma Payment model has been simplified to:
 * - tenantId, id, amount, currency, status, methodType, invoiceId, eventId, clientId
 * - gatewayTransactionId, gatewayPaymentMethodId, processor
 * - processedAt, completedAt, refundedAt
 * - createdAt, updatedAt, deletedAt
 */

import { database, type Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import {
  extractIdempotencyKey,
  IdempotencyKeyError,
  lookupIdempotentResponse,
  storeIdempotentResponse,
} from "@/lib/http-idempotency";
import { translatePrismaError } from "@/lib/prisma-error";
import {
  captureException,
  generatePaymentNumber,
  type PaymentListResponse,
  type PaymentResponse,
  parsePaginationParams,
  parsePaymentFilters,
  validateCreatePaymentRequest,
} from "./validation";

// This route constructs the Manifest runtime (createManifestRuntime), which depends on
// Node-only APIs (Prisma, node:crypto). Pin it to the Node.js runtime so it never gets
// bundled for the Edge runtime. Enforced by manifest-runtime-node.invariant.test.ts.
export const runtime = "nodejs";

/**
 * Cache scope for `Idempotency-Key`-protected payment creation.
 * Stored as `http:accounting:payments:create:<key>` in `manifest_idempotency`.
 */
const PAYMENT_CREATE_IDEMPOTENCY_SCOPE = "accounting:payments:create";

/**
 * GET /api/accounting/payments
 * List all payments with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const filters = parsePaymentFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause with proper typing
    const where: Prisma.PaymentWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.methodType) {
      where.methodType = filters.methodType;
    }

    if (filters.invoiceId) {
      where.invoiceId = filters.invoiceId;
    }

    if (filters.eventId) {
      where.eventId = filters.eventId;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.processedAt = {};
      if (filters.dateFrom) {
        (where.processedAt as Prisma.DateTimeFilter<"Payment">).gte = new Date(
          filters.dateFrom
        );
      }
      if (filters.dateTo) {
        (where.processedAt as Prisma.DateTimeFilter<"Payment">).lte = new Date(
          filters.dateTo
        );
      }
    }

    if (filters.amountFrom || filters.amountTo) {
      where.amount = {};
      if (filters.amountFrom) {
        (where.amount as Prisma.DecimalFilter<"Payment">).gte =
          filters.amountFrom;
      }
      if (filters.amountTo) {
        (where.amount as Prisma.DecimalFilter<"Payment">).lte =
          filters.amountTo;
      }
    }

    // Get payments
    const [payments, totalCount] = await Promise.all([
      database.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDirection },
      }),
      database.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json<PaymentListResponse>({
      data: payments.map((p) => ({
        ...p,
        amount: p.amount.toString(),
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
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error listing payments:", error);
    return NextResponse.json(
      { error: "Failed to list payments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/payments
 * Create a new payment.
 *
 * SECURITY INVARIANT (idempotency)
 * --------------------------------
 * If the caller supplies an `Idempotency-Key` (or `X-Idempotency-Key`) header,
 * the route guarantees AT MOST ONE Payment row will be created for that
 * (tenantId, key) pair within the cache TTL (24h). A retry of the same
 * request — same body or different — receives the cached 201 response with
 * `X-Idempotent-Replay: true` instead of creating a duplicate row. Without
 * this protection, a network retry that succeeded on the first attempt but
 * never reached the client would silently create a SECOND payment, and once a
 * real Stripe charge call lands inside this handler that would be a duplicate
 * charge.
 *
 * Cache lookup happens AFTER tenant resolution and BEFORE body parsing so a
 * confirmed cache hit short-circuits all expensive work. Only successful
 * (status 201) responses are cached — validation errors stay un-cached so the
 * client may correct the body and retry under the same key.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    let idempotencyKey: string | undefined;
    try {
      idempotencyKey = extractIdempotencyKey(request);
    } catch (error) {
      if (error instanceof IdempotencyKeyError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    if (idempotencyKey !== undefined) {
      const cached = await lookupIdempotentResponse(
        tenantId,
        PAYMENT_CREATE_IDEMPOTENCY_SCOPE,
        idempotencyKey
      );
      if (cached !== null) {
        return NextResponse.json(cached.body, {
          status: cached.status,
          headers: { "X-Idempotent-Replay": "true" },
        });
      }
    }

    const body = await request.json();

    validateCreatePaymentRequest(body);

    // Verify invoice exists and belongs to tenant
    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id: body.invoiceId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Verify event exists and belongs to tenant
    const event = await database.event.findFirst({
      where: {
        tenantId,
        id: body.eventId,
        deletedAt: null,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Generate payment reference
    const paymentNumber = generatePaymentNumber(tenantId);

    // Create payment - only use fields that exist in the schema
    const payment = await database.payment.create({
      data: {
        tenantId,
        invoiceId: body.invoiceId,
        eventId: body.eventId,
        clientId: invoice.clientId,
        amount: body.amount,
        currency: body.currency || "USD",
        status: "PENDING",
        methodType: body.methodType,
        gatewayPaymentMethodId: body.paymentMethodId || null,
        gatewayTransactionId: paymentNumber,
        processor: body.processor || null,
        processedAt: new Date(),
      },
    });

    // ── Manifest-governed payment processing ──
    // Process the payment through Manifest's command layer, which handles
    // status transitions, event emission, and cross-entity updates.
    const manifestRuntime = await createManifestRuntime({
      user: {
        id: invoice.clientId,
        tenantId,
        role: "manager", // TODO: derive from actual auth context
      },
    });

    const processResult = await manifestRuntime.runCommand(
      "process",
      { gatewayTransactionId: paymentNumber },
      { entityName: "Payment", instanceId: payment.id }
    );

    if (!processResult.success) {
      // Payment could not be processed — mark as FAILED and return error.
      // The row exists (created via Prisma) but Manifest rejected the command.
      await database.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      log.error("Payment.process via Manifest failed", {
        paymentId: payment.id,
        invoiceId: body.invoiceId,
        error: processResult.error,
      });
      return NextResponse.json(
        { error: `Payment processing failed: ${processResult.error ?? "manifest rejection"}` },
        { status: 500 }
      );
    }

    // Apply payment to the linked invoice
    const applyResult = await manifestRuntime.runCommand(
      "applyPayment",
      { paymentAmount: body.amount, paymentId: payment.id },
      { entityName: "Invoice", instanceId: body.invoiceId }
    );

    if (!applyResult.success) {
      // Payment is COMPLETED but couldn't be applied to the invoice.
      // Common cause: invoice is DRAFT (guard requires SENT/VIEWED/OVERDUE/PARTIALLY_PAID).
      // Mark as accepted-but-not-applied so this state is visible and recoverable.
      await database.payment.update({
        where: { id: payment.id },
        data: { status: "ACCEPTED_NOT_APPLIED" },
      });
      log.warn("Invoice.applyPayment via Manifest failed — payment accepted but not applied to invoice", {
        invoiceId: body.invoiceId,
        paymentId: payment.id,
        error: applyResult.error,
      });

      // Write activity feed entry for the partial success
      await database.activityFeed.create({
        data: {
          tenantId,
          activityType: "payment",
          entityType: "Payment",
          entityId: payment.id,
          action: "process",
          title: `Payment of $${body.amount} accepted (not applied to invoice)`,
          description: `Payment for invoice ${body.invoiceId} on event ${body.eventId} via ${body.methodType}. Apply failed: ${applyResult.error}`,
          metadata: {
            invoiceId: body.invoiceId,
            eventId: body.eventId,
            amount: body.amount,
            paymentNumber,
            manifestProcessed: true,
            invoiceUpdated: false,
            applyError: applyResult.error,
          },
          performedBy: invoice.clientId,
          sourceType: "Payment",
          sourceId: payment.id,
          importance: "high",
          visibility: "all",
          createdAt: new Date(),
        },
      });

      const acceptedResponse: PaymentResponse = {
        ...payment,
        amount: payment.amount.toString(),
        status: "ACCEPTED_NOT_APPLIED" as PaymentResponse["status"],
      };

      return NextResponse.json<PaymentResponse & { warning: string }>(
        { ...acceptedResponse, warning: `Payment accepted but not applied to invoice: ${applyResult.error}` },
        { status: 201 }
      );
    }

    // ── Activity feed audit entry (full success path) ──
    await database.activityFeed.create({
      data: {
        tenantId,
        activityType: "payment",
        entityType: "Payment",
        entityId: payment.id,
        action: "process",
        title: `Payment of $${body.amount} processed`,
        description: `Payment for invoice ${body.invoiceId} on event ${body.eventId} via ${body.methodType}`,
        metadata: {
          invoiceId: body.invoiceId,
          eventId: body.eventId,
          amount: body.amount,
          paymentNumber,
          manifestProcessed: true,
          invoiceUpdated: true,
        },
        performedBy: invoice.clientId,
        sourceType: "Payment",
        sourceId: payment.id,
        importance: "normal",
        visibility: "all",
        createdAt: new Date(),
      },
    });

    const responseBody: PaymentResponse = {
      ...payment,
      amount: payment.amount.toString(),
    };

    if (idempotencyKey !== undefined) {
      await storeIdempotentResponse(
        tenantId,
        PAYMENT_CREATE_IDEMPOTENCY_SCOPE,
        idempotencyKey,
        { status: 201, body: responseBody }
      );
    }

    return NextResponse.json<PaymentResponse>(responseBody, { status: 201 });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
