/**
 * Payment Gateway Adapter
 *
 * Single seam between the accounting routes and the configured payment
 * gateway (Stripe). Today this is a server-side placeholder that always
 * succeeds and emits a deterministic transaction ID; the real
 * `packages/payments` Stripe client must replace the body of
 * `processPaymentGateway` once the integration is wired up. Keeping the
 * interface stable means routes do not change when that swap happens.
 *
 * SECURITY INVARIANT
 * ------------------
 * The PUT /api/accounting/payments/[id] handler MUST NOT read the gateway
 * outcome (success / failure / transaction ID) from the request body. Doing
 * so would let any authenticated tenant caller mark an arbitrary PENDING
 * payment as `COMPLETED` simply by sending
 * `{ gatewayResponse: { code: "200", transactionId: "x" } }`, which then
 * cascades into the invoice ledger as a phantom credit. The gateway result
 * is the system of record for whether a charge actually happened, so it
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
