/**
 * batchTransactionTimeout — pool-hold bound regression guard (db-perf #29).
 *
 * WHY THIS TEST EXISTS: runManifestBatch wraps every operation in ONE
 * interactive Prisma `$transaction`, which checks out a single pool
 * connection (max:20) for the whole batch. The original timeout scaled with
 * batch size up to a 120s ceiling, so a handful of concurrent large batches
 * could each pin a connection for up to two minutes, exhaust the pool, and
 * starve every other request (Prisma P2024 after the 10s `maxWait`). The
 * ceiling is now the app-wide transaction timeout (30s). This test pins that
 * bound so a future change cannot silently restore the 120s hold.
 *
 * The helper is a pure function over op count, so this needs no DB/runtime
 * mocks — it asserts the math that guards availability.
 */
import { describe, expect, it } from "vitest";

import {
  batchTransactionTimeout,
  MAX_BATCH_TRANSACTION_TIMEOUT,
} from "@/lib/manifest/batch-timeout";

// The default ceiling mirrors packages/database {index,standalone}.ts
// transactionOptions.timeout (30s). Importing MAX_BATCH_SIZE from the heavy
// execute-command module would drag the whole runtime into this pure test, so
// the max-batch default (50, per MANIFEST_BATCH_MAX_SIZE) is mirrored here.
const DEFAULT_MAX_BATCH_SIZE = 50;

describe("batchTransactionTimeout — $transaction pool-hold bound (#29)", () => {
  it("default ceiling is the app-wide transaction timeout (30s), not the old 120s", () => {
    // env unset in the test run → default applies. Pins the fix: a batch must
    // not hold a pool connection 4x longer than a normal tx.
    expect(MAX_BATCH_TRANSACTION_TIMEOUT).toBe(30_000);
  });

  it("never exceeds the ceiling at or beyond the max batch size", () => {
    // A max-size batch (50 ops) previously computed 50*2000+5000 = 105s; it
    // must now hit the bounded ceiling.
    expect(batchTransactionTimeout(DEFAULT_MAX_BATCH_SIZE)).toBe(
      MAX_BATCH_TRANSACTION_TIMEOUT
    );
    // A pathologically large op count (e.g. an env-raised cap) cannot escape.
    expect(batchTransactionTimeout(DEFAULT_MAX_BATCH_SIZE * 10)).toBe(
      MAX_BATCH_TRANSACTION_TIMEOUT
    );
  });

  it("gives small batches proportional headroom below the ceiling", () => {
    expect(batchTransactionTimeout(1)).toBe(7000); // 1*2000 + 5000
    expect(batchTransactionTimeout(5)).toBe(15_000); // 5*2000 + 5000
    // 12 ops → 29s, still just under the 30s ceiling.
    expect(batchTransactionTimeout(12)).toBe(29_000);
  });

  it("clamps to the ceiling once the scaling formula would exceed it", () => {
    // 13 ops → formula yields 31s, clamped to the 30s ceiling.
    expect(batchTransactionTimeout(13)).toBe(MAX_BATCH_TRANSACTION_TIMEOUT);
  });
});
