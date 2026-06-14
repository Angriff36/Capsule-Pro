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
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { requireApiManager } from "@/app/lib/auth-roles";
import { requireTenantId, resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { translatePrismaError } from "@/lib/prisma-error";
import { checkRateLimit } from "@/middleware/rate-limiter";
import {
  captureException,
  type PaymentResponse,
  validatePaymentAccess,
  validatePaymentBusinessRules,
  validateRefundRequest,
} from "../validation";
import { processPaymentGateway, refundPaymentGateway } from "./gateway";

// This route constructs the Manifest runtime (createManifestRuntime), which depends on
// Node-only APIs (Prisma, node:crypto). Pin it to the Node.js runtime so it never gets
// bundled for the Edge runtime.
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Sensitive-mutation rate limit options for payment process/refund.
 *
 * The global limiter (apps/api/middleware/global-rate-limit.ts) caps every
 * authenticated request at 100/min/tenant. That cap is too generous for
 * money-moving operations: a leaked session can burn ~100 charge or refund
 * attempts before the global ceiling kicks in, which is more than enough to
 * empty an event's refund budget or hammer the processor into a fraud lock.
 *
 * 20 requests / 60s / (tenant + endpoint + identifier) is a tight cap that
 * still leaves headroom for legitimate human-driven flows (a busy ops user
 * processing a queue of receipts) but stops abusive scripts cold. The
 * `payments_sensitive` prefix keeps this counter isolated from the global
 * pool — exhausting the sensitive bucket does NOT block read traffic on the
 * same session, and exhausting the global pool does NOT pre-consume the
 * sensitive bucket.
 *
 * Failure mode: `checkRateLimit` already fails OPEN on Redis connection
 * errors (rate-limiter.ts:415), so an Upstash outage degrades to "global
 * limit only" rather than locking out all payment mutations.
 */
const SENSITIVE_RATE_LIMIT = {
  limit: 20,
  window: "1m",
  prefix: "payments_sensitive",
} as const;

/**
 * GET /api/accounting/payments/[id]
 * Get a single payment by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
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
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error fetching payment", { error });
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/payments/[id]/process
 * Process a payment through gateway.
 *
 * SECURITY INVARIANT — DO NOT REMOVE
 *
 * The outcome of this charge (COMPLETED vs FAILED) and the persisted
 * `gatewayTransactionId` are decided EXCLUSIVELY by `processPaymentGateway`.
 * The HTTP request body is intentionally NOT parsed in this handler.
 *
 * Historical bug: this handler used to read `body.gatewayResponse.code`
 * and treat `"200" || "1"` as a success signal, which let any
 * authenticated tenant client phantom-credit a PENDING payment and
 * cascade `invoice.amountPaid += payment.amount` to flip the invoice to
 * PAID with no real money moving. If you find yourself adding
 * `request.json()` back to this function, stop and read
 * `./gateway.ts` first.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Payment processing moves real money and
    // mutates invoice ledger state — any tenant member with a session must NOT
    // be able to settle charges. Returns 401/403 with structured body when the
    // caller lacks finance_manager / operations_manager / staff_manager / admin.
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;

    // Sensitive-mutation throttle. Runs BEFORE any DB read so abusive
    // callers cannot probe for valid payment IDs or burn DB capacity by
    // looping on the process endpoint. See SENSITIVE_RATE_LIMIT comment.
    const rateLimit = await checkRateLimit(
      request,
      tenantId,
      SENSITIVE_RATE_LIMIT
    );
    if (!rateLimit.success && rateLimit.response) {
      return rateLimit.response;
    }

    const { id } = await context.params;

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

    // Server-side gateway call. The result is authoritative — the body of
    // the request is NEVER consulted to decide success/failure or to
    // generate the transaction ID.
    const gatewayResult = await processPaymentGateway({
      paymentId: payment.id,
      tenantId,
      amount: Number(payment.amount),
      currency: payment.currency,
      gatewayPaymentMethodId: payment.gatewayPaymentMethodId,
    });

    const isCompleted = gatewayResult.success;

    // Resolve current user for Manifest runtime context
    const user = await resolveCurrentUser(request);

    // Update payment status via Manifest runtime — invoice update handled by the
    // PaymentProcessed → Invoice.applyPayment middleware
    // (payment-processed-invoice-apply-middleware.ts), which loads the processed
    // Payment and credits its linked invoice.
    const manifestRuntime = await createManifestRuntime({
      user: { id: user.id, tenantId, role: user.role },
    });

    const manifestResult = await manifestRuntime.runCommand(
      isCompleted ? "process" : "processFailed",
      { gatewayTransactionId: gatewayResult.transactionId },
      { entityName: "Payment", instanceId: id }
    );

    if (!manifestResult.success) {
      log.error("Payment.process via Manifest failed", {
        paymentId: id,
        error: manifestResult.error,
      });
      return NextResponse.json(
        {
          error: `Payment processing failed: ${manifestResult.error ?? "manifest rejection"}`,
        },
        { status: 500 }
      );
    }

    // Re-fetch payment for response (Manifest owns the mutation now)
    const updatedPayment = await database.payment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    return NextResponse.json<PaymentResponse>({
      ...updatedPayment!,
      amount: updatedPayment!.amount.toString(),
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
    log.error("Error processing payment", { error });
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/payments/[id]/refund
 * Refund a payment
 *
 * SECURITY / LEDGER INVARIANTS:
 *  - The refund amount applied to the ledger MUST be clamped at payment.amount.
 *    A caller-supplied refund of $250 against a $100 payment MUST adjust the
 *    invoice by $100, not $250 — otherwise invoice.amountPaid goes negative
 *    and amountDue inflates beyond the contract total.
 *  - Pass status (REFUNDED vs PARTIALLY_REFUNDED) MUST be derived from the
 *    *clamped* effectiveRefund, never from the caller's body.amount.
 *  - Invoice.status MUST be re-derived after a refund. A fully-paid invoice
 *    that gets refunded must NOT remain "PAID" — it should fall back to
 *    "SENT" (no money on file) or "PARTIALLY_PAID" (some money still on
 *    file). paidAt MUST be cleared when the invoice is no longer paid.
 *  - Refund gateway is authoritative. `refundPaymentGateway` is called
 *    BEFORE any payment/invoice mutation; on `success: false` the handler
 *    returns 502 and performs NO mutations to payment or invoice rows. This
 *    keeps local ledger state in sync with the processor — a payment that
 *    is still COMPLETED on Stripe must remain COMPLETED here. The persisted
 *    refund transaction ID and the original charge transaction ID come
 *    from the database, NEVER from the request body.
 *  - Every refund gateway call (success OR failure) writes one row to
 *    `payment_refund_attempts`. This is an append-only forensic trail that
 *    captures the gateway-side `refundTransactionId` and `failureReason`
 *    that would otherwise be lost when the 502 closes the connection.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Refunds move real money and re-derive
    // invoice status — must not be reachable from a base-staff session.
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;

    // Sensitive-mutation throttle. Runs BEFORE we parse the body or touch
    // the DB so refund-spam cannot drive processor calls or generate
    // partial-refund noise on the original payment row. See
    // SENSITIVE_RATE_LIMIT comment.
    const rateLimit = await checkRateLimit(
      request,
      tenantId,
      SENSITIVE_RATE_LIMIT
    );
    if (!rateLimit.success && rateLimit.response) {
      return rateLimit.response;
    }

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
    // Clamp the refund at the payment amount. Callers can request larger
    // numbers (typo, double-click, abuse) but the ledger only ever sees the
    // capped value.
    const effectiveRefund = Math.min(Number(body.amount), paymentAmount);
    const isFullRefund = effectiveRefund >= paymentAmount - 0.005;

    // Server-side refund gateway call. Runs BEFORE any DB mutation. The
    // original charge transaction ID is sourced from the persisted payment
    // row (NEVER `body.refundTransactionId` or any other caller field) so
    // the processor can correlate the refund back to its charge. On gateway
    // failure we 502 and write nothing — the local payment must remain
    // COMPLETED to mirror the processor's state.
    const gatewayResult = await refundPaymentGateway({
      paymentId: payment.id,
      tenantId,
      amount: effectiveRefund,
      currency: payment.currency,
      reason: String(body.reason),
      originalGatewayTransactionId: payment.gatewayTransactionId,
    });

    // Persist a permanent audit row for EVERY refund gateway call — success
    // or failure. This is the forensic record that survives the 502 closing
    // the user's connection on failure, and the only ledger of partial
    // refunds against a single payment over time.
    //
    // The write is best-effort: if the audit insert fails (DB outage, RLS
    // misconfiguration), we log via Sentry and continue. We do NOT roll back
    // the gateway-side money movement because the audit row was unavailable.
    // The append-only RLS policy ensures these rows can never be tampered
    // with after the fact.
    try {
      await database.paymentRefundAttempt.create({
        data: {
          tenantId,
          paymentId: payment.id,
          requestedAmount: Number(body.amount),
          effectiveAmount: effectiveRefund,
          refundReason: String(body.reason),
          originalGatewayTransactionId: payment.gatewayTransactionId,
          refundTransactionId: gatewayResult.refundTransactionId,
          success: gatewayResult.success,
          failureReason: gatewayResult.failureReason ?? null,
        },
      });
    } catch (auditError) {
      captureException(auditError);
      log.error("Failed to persist payment refund audit row (continuing)", {
        error: auditError,
      });
    }

    if (!gatewayResult.success) {
      return NextResponse.json(
        {
          error: "Refund gateway rejected the refund",
          failureReason: gatewayResult.failureReason,
          refundTransactionId: gatewayResult.refundTransactionId,
        },
        { status: 502 }
      );
    }

    // Update payment via Manifest runtime — invoice update handled by
    // PaymentRefunded reaction (on PaymentRefunded run Invoice.recordRefund).
    const user = await resolveCurrentUser(request);

    const manifestRuntime = await createManifestRuntime({
      user: { id: user.id, tenantId, role: user.role },
    });

    const manifestResult = await manifestRuntime.runCommand(
      isFullRefund ? "refund" : "partialRefund",
      { refundAmount: effectiveRefund, reason: String(body.reason) },
      { entityName: "Payment", instanceId: id }
    );

    if (!manifestResult.success) {
      log.error("Payment.refund via Manifest failed", {
        paymentId: id,
        error: manifestResult.error,
      });
      return NextResponse.json(
        {
          error: `Refund failed: ${manifestResult.error ?? "manifest rejection"}`,
        },
        { status: 500 }
      );
    }

    // Re-fetch payment for response (Manifest owns the mutation now)
    const updatedPayment = await database.payment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    return NextResponse.json<PaymentResponse>({
      ...updatedPayment!,
      amount: updatedPayment!.amount.toString(),
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
    log.error("Error refunding payment", { error });
    return NextResponse.json(
      { error: "Failed to refund payment" },
      { status: 500 }
    );
  }
}
