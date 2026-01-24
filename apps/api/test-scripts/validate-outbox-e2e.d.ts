/**
 * E2E validation script for outbox publish flow.
 * Run with: pnpm tsx test-scripts/validate-outbox-e2e.ts
 *
 * This script validates:
 * 1. Creating an outbox event via createOutboxEvent helper
 * 2. Publishing via /api/outbox/publish endpoint
 * 3. Verifying status becomes published
 * 4. Verifying Ably message format includes envelope
 */
export {};
//# sourceMappingURL=validate-outbox-e2e.d.ts.map
