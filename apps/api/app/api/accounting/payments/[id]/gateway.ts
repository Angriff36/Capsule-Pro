/**
 * Payment Gateway Server-Side Seam
 *
 * SECURITY INVARIANT — DO NOT REMOVE
 *
 * The outcome of a payment charge MUST be decided server-side. The HTTP
 * request body of the route handler MUST NOT determine whether a payment
 * is moved to COMPLETED, FAILED, or anything else, and MUST NOT determine
 * the persisted `gatewayTransactionId`.
 *
 * Historical bug (closed by introducing this module): the route handler
 * accepted `body.gatewayResponse.code` and treated `"200" || "1"` as a
 * COMPLETED signal. Any authenticated tenant client could phantom-credit
 * a PENDING payment and cascade an `invoice.amountPaid += payment.amount`
 * write that flipped the invoice to PAID — without any money moving on
 * a real processor.
 *
 * The route handler now calls `processPaymentGateway` instead of reading
 * the body. This implementation calls Stripe PaymentIntents via the
 * initialized `stripe` client from `@repo/payments`. The contract (input
 * shape + return shape) is the processor-agnostic seam:
 *   1. Uses the configured `stripe` client from `packages/payments`.
 *   2. Returns `success: false, failureReason: "<processor-side reason>"`
 *      for declines, network errors, or unrecoverable timeouts.
 *   3. Keeps the `transactionId` server-side authoritative — the caller
 *      persists exactly that value as `payment.gatewayTransactionId`.
 *
 * Refund path: the symmetric helper is `refundPaymentGateway`. Same rule —
 * the caller MUST NOT trust `body.refundTransactionId` or any other
 * caller-supplied identifier; the persisted refund ID comes from this
 * module's return value only.
 */

import { log } from "@repo/observability/log";
import { stripe } from "@repo/payments";

export interface ProcessPaymentInput {
  amount: number;
  currency: string;
  /** Stored Stripe PaymentMethod ID (pm_*) from a prior client-side setup. */
  gatewayPaymentMethodId?: string | null;
  paymentId: string;
  tenantId: string;
}

export interface ProcessPaymentResult {
  failureReason?: string;
  success: boolean;
  transactionId: string;
}

export interface RefundPaymentInput {
  amount: number;
  currency: string;
  /**
   * Server-known charge transaction ID from the original Payment row's
   * `gatewayTransactionId`. Required for the real processor to correlate
   * the refund back to its charge. The caller MUST source this from the
   * persisted payment record, NEVER from the HTTP request body.
   */
  originalGatewayTransactionId: string | null;
  paymentId: string;
  reason: string;
  tenantId: string;
}

export interface RefundPaymentResult {
  failureReason?: string;
  refundTransactionId: string;
  success: boolean;
}

const SUCCESS_STATUSES = new Set(["succeeded", "requires_capture"]);

/**
 * Process a charge through Stripe.
 *
 * Creates a PaymentIntent and, when a payment method is available,
 * confirms it immediately. Returns the PaymentIntent ID (pi_*) as the
 * authoritative transaction ID.
 */
export async function processPaymentGateway(
  input: ProcessPaymentInput
): Promise<ProcessPaymentResult> {
  try {
    const amountCents = Math.round(input.amount * 100);

    const params: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: amountCents,
      currency: input.currency.toLowerCase(),
      metadata: {
        paymentId: input.paymentId,
        tenantId: input.tenantId,
      },
    };

    if (input.gatewayPaymentMethodId) {
      params.payment_method = input.gatewayPaymentMethodId;
      params.confirm = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(params, {
      idempotencyKey: `pay_${input.paymentId}`,
    });

    if (SUCCESS_STATUSES.has(paymentIntent.status)) {
      return {
        success: true,
        transactionId: paymentIntent.id,
      };
    }

    return {
      success: false,
      transactionId: paymentIntent.id,
      failureReason: `Payment intent status: ${paymentIntent.status}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment processing failed";
    log.error("Payment gateway error", { error });
    return {
      success: false,
      transactionId: "",
      failureReason: message,
    };
  }
}

/**
 * Process a refund through Stripe.
 *
 * Creates a Refund against the original PaymentIntent. Returns the
 * Stripe Refund ID (re_*) as the authoritative refund transaction ID.
 */
export async function refundPaymentGateway(
  input: RefundPaymentInput
): Promise<RefundPaymentResult> {
  try {
    if (!input.originalGatewayTransactionId) {
      return {
        success: false,
        refundTransactionId: "",
        failureReason: "No original transaction ID to refund",
      };
    }

    const amountCents = Math.round(input.amount * 100);

    const refund = await stripe.refunds.create({
      payment_intent: input.originalGatewayTransactionId,
      amount: amountCents,
      reason: "requested_by_customer",
      metadata: {
        paymentId: input.paymentId,
        tenantId: input.tenantId,
        originalReason: input.reason,
      },
    });

    const succeeded =
      refund.status === "succeeded" || refund.status === "pending";

    return {
      success: succeeded,
      refundTransactionId: refund.id,
      ...(succeeded
        ? {}
        : { failureReason: `Refund status: ${refund.status}` }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Refund processing failed";
    log.error("Refund gateway error", { error });
    return {
      success: false,
      refundTransactionId: "",
      failureReason: message,
    };
  }
}
