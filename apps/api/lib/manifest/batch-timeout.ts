/**
 * Per-batch `$transaction` timeout bound (db-performance plan item #29).
 *
 * WHY THIS EXISTS — {@link runManifestBatch} (execute-command.ts) wraps every
 * operation in ONE interactive Prisma `$transaction`. An interactive
 * transaction checks out a SINGLE pool connection for its entire duration (pool
 * `max: 20`, `packages/database/create-pg-adapter.ts`). The prior timeout
 * scaled with batch size up to a 120s ceiling, so a few concurrent large
 * batches could each pin a connection for up to two minutes, exhaust the
 * `max:20` pool, and starve every other request (Prisma P2024 after the 10s
 * `maxWait`). The batch is also already size-capped at {@link MAX_BATCH_SIZE}
 * (default 50, env `MANIFEST_BATCH_MAX_SIZE`), and the apps/app bulk-action UI
 * chunks at 50, so a single request never legitimately carries a huge batch.
 *
 * THE BOUND — the ceiling is the app-wide `transactionOptions.timeout`
 * (30s, `packages/database/{index,standalone}.ts`). A batch is still one
 * transaction holding one connection; it must not hold that connection
 * dramatically longer than any other transaction. The per-op scaling in
 * {@link batchTransactionTimeout} preserves proportional headroom for small
 * batches UNDER this ceiling. A batch that cannot finish in this window is too
 * big or too slow and should fail fast so its connection is released back to
 * the pool. Override via `MANIFEST_BATCH_TX_TIMEOUT` only for a workload with
 * legitimately heavy per-op work; the default mirrors the standard tx timeout.
 */
export const MAX_BATCH_TRANSACTION_TIMEOUT =
  Number(process.env.MANIFEST_BATCH_TX_TIMEOUT) || 30_000;

/**
 * Compute the `$transaction` timeout for a batch of `opCount` governed ops.
 *
 * Scales with op count (2s/op + 5s base) so small batches keep proportional
 * headroom, then clamps at {@link MAX_BATCH_TRANSACTION_TIMEOUT} so a single
 * batch can never hold a pool connection longer than the app-wide transaction
 * ceiling.
 */
export function batchTransactionTimeout(opCount: number): number {
  return Math.min(opCount * 2000 + 5000, MAX_BATCH_TRANSACTION_TIMEOUT);
}
