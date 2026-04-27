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
 * the body. The implementation here is a deterministic always-success
 * placeholder; the contract (input shape + return shape) is the swap
 * point for a real Stripe / Adyen / Authorize.Net call. When the real
 * call lands it MUST:
 *   1. Use the configured `stripe` (or equivalent) client from
 *      `packages/payments`, never `fetch()` from inside this file.
 *   2. Return `success: false, failureReason: "<processor-side reason>"`
 *      for declines, network errors, or unrecoverable timeouts.
 *   3. Keep the `transactionId` it returns server-side authoritative —
 *      the caller MUST persist exactly that value as
 *      `payment.gatewayTransactionId`.
 *
 * Refund path: the symmetric helper is `refundPaymentGateway`. Same rule —
 * the caller MUST NOT trust `body.refundTransactionId` or any other
 * caller-supplied identifier; the persisted refund ID comes from this
 * module's return value only.
 */

import { randomUUID } from "node:crypto";

export interface ProcessPaymentInput {
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  transactionId: string;
  failureReason?: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
  reason: string;
  /**
   * Server-known charge transaction ID from the original Payment row's
   * `gatewayTransactionId`. Required for the real processor to correlate
   * the refund back to its charge. The caller MUST source this from the
   * persisted payment record, NEVER from the HTTP request body.
   */
  originalGatewayTransactionId: string | null;
}

export interface RefundPaymentResult {
  success: boolean;
  refundTransactionId: string;
  failureReason?: string;
}

/**
 * Process a charge through the payment gateway.
 *
 * Placeholder implementation: deterministic always-success. Returns a
 * server-generated transaction ID (`txn_<uuid>`) that the caller persists
 * as `payment.gatewayTransactionId`.
 *
 * Real-processor swap-in checklist:
 *   - Replace the body with a `stripe.paymentIntents.create({...}).confirm()`
 *     call (or equivalent). Use `paymentId` as the idempotency key.
 *   - Map processor errors to `{ success: false, failureReason }`.
 *   - Keep the function signature stable; the route handler depends on it.
 */
export async function processPaymentGateway(
  input: ProcessPaymentInput
): Promise<ProcessPaymentResult> {
  // Reference inputs so the placeholder is not flagged as unused; the real
  // call will consume all four.
  void input.paymentId;
  void input.tenantId;
  void input.amount;
  void input.currency;

  return {
    success: true,
    transactionId: `txn_${randomUUID()}`,
  };
}

/**
 * Process a refund through the payment gateway.
 *
 * Placeholder implementation: deterministic always-success. Returns a
 * server-generated refund ID (`re_<uuid>`).
 *
 * Real-processor swap-in checklist:
 *   - Replace the body with `stripe.refunds.create({ payment_intent:
 *     originalGatewayTransactionId, amount, reason })` or equivalent.
 *   - Map processor errors to `{ success: false, failureReason }`.
 *   - The caller treats `success: false` as a 502 short-circuit and
 *     does NOT mutate the local payment or invoice rows.
 */
export async function refundPaymentGateway(
  input: RefundPaymentInput
): Promise<RefundPaymentResult> {
  void input.paymentId;
  void input.tenantId;
  void input.amount;
  void input.currency;
  void input.reason;
  void input.originalGatewayTransactionId;

  return {
    success: true,
    refundTransactionId: `re_${randomUUID()}`,
  };
}
