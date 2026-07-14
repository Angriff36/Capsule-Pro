/**
 * DB query-count regression guard (#28, db-performance test/regression harness).
 *
 * The `apps/api` suite mocks `@repo/database` (see `test/mocks/@repo/database.ts`)
 * — no real SQL ever runs — so a reintroduced N+1 or a write-on-GET has no
 * automated signal. Existing route tests pin ONE method on ONE model
 * (`expect(model.findMany).toHaveBeenCalledTimes(1)`); they cannot catch a new
 * `findMany` on a *different* model, nor assert "this GET never mutates."
 *
 * This helper tallies every recorded DB call across ALL models + top-level raw
 * methods, classified read / write / raw, by reading each `vi.fn`'s `mock.calls`
 * (which `restoreMocks: true` clears per test — no manual reset).
 *
 * Use:
 *   expectTotalDbCalls(database, 2);   // exactly 2 reads → trips on an added N+1
 *   expectNoDbWrites(database);       // read-only-on-GET (#2/#16 invariant)
 *
 * Composes with any mocked `database` (the config-level Proxy OR a per-file
 * `vi.mock("@repo/database", ...)` object): it is a pure read of mock state.
 */
import { expect } from "vitest";

/** Structural shape of a vitest mock function — has `.mock.calls`. */
interface MockFnLike {
  mock: { calls: unknown[] };
}

const READ_OPS = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

const WRITE_OPS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

// Top-level (non-model) client operations.
const RAW_READ_OPS = new Set(["$queryRaw", "$queryRawUnsafe"]);
const RAW_WRITE_OPS = new Set(["$executeRaw", "$executeRawUnsafe"]);

const isMockFn = (v: unknown): v is MockFnLike =>
  typeof v === "function" &&
  "mock" in v &&
  Array.isArray((v as MockFnLike).mock?.calls);

export interface DbCallTally {
  /** One `"model.op"` (or `"op"` for top-level raw) entry per call, in order. */
  calls: string[];
  /** raw read queries (`$queryRaw` / `$queryRawUnsafe`). */
  raws: number;
  reads: number;
  /** reads + writes + raws. */
  total: number;
  /** Subset of `calls` that are writes — non-empty only if the route mutated. */
  writeCalls: string[];
  writes: number;
}

/**
 * Tally every DB call recorded on a mocked `database`, classified read/write/raw.
 *
 * Typed `object` (not `Record<string, unknown>`) so a route test can pass its
 * `PrismaClient`-typed `database` import directly — the runtime is the config
 * mock; only `.mock.calls` is read. Internally narrowed back to a record so the
 * element type stays `unknown`.
 */
export function tallyDbCalls(database: object): DbCallTally {
  let reads = 0;
  let writes = 0;
  let raws = 0;
  const calls: string[] = [];
  const writeCalls: string[] = [];

  const push = (label: string, n: number, write = false) => {
    for (let i = 0; i < n; i++) {
      calls.push(label);
      if (write) {
        writeCalls.push(label);
      }
    }
  };

  for (const [key, value] of Object.entries(database as Record<string, unknown>)) {
    // Top-level raw op (database.$queryRaw …) — value itself is the mock fn.
    if (isMockFn(value)) {
      const n = value.mock.calls.length;
      if (RAW_READ_OPS.has(key)) {
        raws += n;
        push(key, n);
      } else if (RAW_WRITE_OPS.has(key)) {
        writes += n;
        push(key, n, true);
      }
      // $transaction / $connect / $disconnect / $on are structural — not counted.
      continue;
    }

    // Model delegate: { op: vi.fn, … }.
    if (value && typeof value === "object") {
      for (const [op, fn] of Object.entries(value as Record<string, unknown>)) {
        if (!isMockFn(fn)) {
          continue;
        }
        const n = fn.mock.calls.length;
        if (n === 0) {
          continue;
        }
        const label = `${key}.${op}`;
        if (READ_OPS.has(op)) {
          reads += n;
          push(label, n);
        } else if (WRITE_OPS.has(op)) {
          writes += n;
          push(label, n, true);
        } else if (op.startsWith("$")) {
          // Model-scoped raw op (rare): $executeRaw* writes, otherwise raw read.
          if (op.includes("execute")) {
            writes += n;
            push(label, n, true);
          } else {
            raws += n;
            push(label, n);
          }
        }
      }
    }
  }

  return {
    total: reads + writes + raws,
    reads,
    writes,
    raws,
    calls,
    writeCalls,
  };
}

/** Assert a handler issued exactly `expected` DB calls (any model/op). */
export function expectTotalDbCalls(database: object, expected: number): void {
  const { total, calls } = tallyDbCalls(database);
  expect(
    total,
    `expected ${expected} DB call(s) but recorded ${total} [${calls.join(", ") || "none"}]`
  ).toBe(expected);
}

/** Assert a handler issued zero DB writes — the read-only-on-GET invariant. */
export function expectNoDbWrites(database: object): void {
  const { writes, writeCalls } = tallyDbCalls(database);
  expect(
    writes,
    `expected a read-only route but recorded ${writes} DB write(s) [${writeCalls.join(", ")}]`
  ).toBe(0);
}
