/**
 * Payment Gateway Adapter
 *
 * Single seam between the accounting routes and the configured payment
 * gateway (Stripe). Today the bodies are server-side placeholders that
 * always succeed and emit deterministic transaction IDs; the real
 * `packages/payments` Stripe client must replace `processPaymentGateway`
 * (charge) and `refundPaymentGateway` (refund) once the integration is
 * wired up. Keeping the interfaces stable means routes do not change when
 * that swap happens.
 *
 * SECURITY INVARIANT
 * ------------------
 * The PUT /api/accounting/payments/[id] (charge) and POST
 * /api/accounting/payments/[id] (refund) handlers MUST NOT read the
 * gateway outcome (success / failure / transaction ID) from the request
 * body. Doing so would let any authenticated tenant caller mark an
 * arbitrary PENDING payment as `COMPLETED`, or force a payment they did
 * not actually refund into `REFUNDED` (cascading a phantom debit out of
 * the invoice ledger), simply by sending
 * `{ gatewayResponse: { code: "200", transactionId: "x" } }`. The gateway
 * result is the system of record for whether money actually moved, so it
 * must be produced server-side — either here (placeholder) or by a real
 * Stripe call.
 *
 * Tests mock this module to drive the failure path without a live API.
 */

import { randomUUID } from "node:crypto";

export interface GatewayChargeInput {
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
}

export interface GatewayChargeResult {
  success: boolean;
  transactionId: string;
  failureReason?: string;
}

/**
 * Process a payment through the configured gateway.
 *
 * Returns `{ success: true, transactionId }` on a successful charge or
 * `{ success: false, transactionId, failureReason }` on a gateway-side
 * decline. The transaction ID is always populated so the audit trail
 * records the gateway-side identifier even when the charge failed.
 *
 * TODO(stripe-integration): replace this body with a real Stripe charge
 * call from `packages/payments`. The interface is intentionally narrow so
 * that swap is local to this file.
 */
export async function processPaymentGateway(
  _input: GatewayChargeInput
): Promise<GatewayChargeResult> {
  return Promise.resolve({
    success: true,
    transactionId: `txn_${randomUUID()}`,
  });
}

export interface GatewayRefundInput {
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
  reason: string;
  /**
   * Original charge transaction ID returned by `processPaymentGateway`.
   * Stripe (and most processors) require the original charge ID to
   * correlate the refund back to the underlying payment intent. May be
   * null only on legacy payments that predate the gateway adapter; the
   * route should refuse to call this helper in that case.
   */
  originalGatewayTransactionId: string | null;
}

export interface GatewayRefundResult {
  success: boolean;
  /**
   * Gateway-side identifier for the refund itself (NOT the original
   * charge). Always populated so the audit trail records the
   * gateway-side identifier even when the refund failed.
   */
  refundTransactionId: string;
  failureReason?: string;
}

/**
 * Refund a payment through the configured gateway.
 *
 * Returns `{ success: true, refundTransactionId }` on a successful refund
 * or `{ success: false, refundTransactionId, failureReason }` on a
 * gateway-side decline (e.g. the original charge was already disputed,
 * the refund window has expired, or the destination card has been
 * closed). When the gateway reports failure, the calling route MUST NOT
 * mutate local payment / invoice state — money has not moved on the
 * processor side, so flipping the local record to REFUNDED would create a
 * phantom debit on the invoice ledger that reconciliation cannot recover.
 *
 * TODO(stripe-integration): replace this body with a real Stripe refund
 * call from `packages/payments`. The interface is intentionally narrow so
 * that swap is local to this file.
 */
export async function refundPaymentGateway(
  _input: GatewayRefundInput
): Promise<GatewayRefundResult> {
  return Promise.resolve({
    success: true,
    refundTransactionId: `re_${randomUUID()}`,
  });
}
