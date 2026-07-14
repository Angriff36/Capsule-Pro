/**
 * db-query-tracker — proof that the #28 regression guard actually catches
 * regressions. The full-delegate mock below mirrors the config-level
 * `test/mocks/@repo/database.ts` shape (every op is a vi.fn with a graceful
 * default): a write or extra read the test didn't intend does NOT crash the
 * handler — it is SILENT. This suite makes that silence loud.
 */
import { describe, expect, it, vi } from "vitest";

import {
  expectNoDbWrites,
  expectTotalDbCalls,
  tallyDbCalls,
} from "./db-query-tracker";

function makeDb() {
  // Each op accepts an optional arg so call sites that pass a payload
  // (`.create({ data })`) or use the fn as a template tag (`` $queryRaw`…` ``)
  // type-check; the arg is ignored — only `.mock.calls` matters to the tally.
  const model = () => ({
    findMany: vi.fn(async (_arg?: unknown) => []),
    findFirst: vi.fn(async (_arg?: unknown) => null),
    aggregate: vi.fn(async (_arg?: unknown) => ({})),
    create: vi.fn(async (_arg?: unknown) => ({})),
    update: vi.fn(async (_arg?: unknown) => ({})),
    updateMany: vi.fn(async (_arg?: unknown) => ({ count: 0 })),
    delete: vi.fn(async (_arg?: unknown) => ({})),
  });
  return {
    user: model(),
    client: model(),
    $queryRaw: vi.fn((_strings?: unknown, ..._values: unknown[]) => []),
    $executeRaw: vi.fn((_strings?: unknown, ..._values: unknown[]) => 0),
    // Structural — must NOT be counted as read/write.
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
  };
}

describe("tallyDbCalls", () => {
  it("counts each model read once and labels it model.op", () => {
    const db = makeDb();
    db.user.findMany();
    db.client.findFirst();

    const t = tallyDbCalls(db);
    expect(t.reads).toBe(2);
    expect(t.total).toBe(2);
    expect(t.calls).toEqual(["user.findMany", "client.findFirst"]);
  });

  it("classifies writes separately from reads", () => {
    const db = makeDb();
    db.user.findMany();
    db.user.create({ data: { name: "x" } });
    db.client.update({ where: { id: "1" } });

    const t = tallyDbCalls(db);
    expect(t.reads).toBe(1);
    expect(t.writes).toBe(2);
    expect(t.writeCalls).toEqual(["user.create", "client.update"]);
  });

  it("counts top-level raw reads ($queryRaw) and writes ($executeRaw)", async () => {
    const db = makeDb();
    await db.$queryRaw`SELECT 1`;
    await db.$queryRaw`SELECT 2`;
    await db.$executeRaw`DELETE FROM x`;

    const t = tallyDbCalls(db);
    expect(t.raws).toBe(2);
    expect(t.writes).toBe(1);
    expect(t.total).toBe(3);
    expect(t.calls).toEqual(["$queryRaw", "$queryRaw", "$executeRaw"]);
  });

  it("counts repeated calls to the same op", () => {
    const db = makeDb();
    db.user.findMany();
    db.user.findMany();
    db.user.findMany();

    const t = tallyDbCalls(db);
    expect(t.reads).toBe(3);
  });

  it("ignores zero-call methods and structural ops ($transaction)", () => {
    const db = makeDb();
    db.user.findMany();
    db.$transaction(() => undefined);

    const t = tallyDbCalls(db);
    // client.* exist but were never called; $transaction is structural.
    expect(t.total).toBe(1);
    expect(t.calls).toEqual(["user.findMany"]);
  });
});

describe("expectTotalDbCalls — N+1 regression guard (#28 acceptance)", () => {
  it("passes when the call count matches", () => {
    const db = makeDb();
    db.user.findMany();

    expect(() => expectTotalDbCalls(db, 1)).not.toThrow();
  });

  it("FAILS on a deliberately-introduced N+1 (a second read on another model)", () => {
    const db = makeDb();
    db.user.findMany();
    // Baseline: 1 read passes.
    expect(() => expectTotalDbCalls(db, 1)).not.toThrow();

    // Regression: an added findMany on a DIFFERENT model. A per-method guard
    // (`expect(user.findMany).toHaveBeenCalledTimes(1)`) still passes — only the
    // cross-model total trips. This is the exact regression the suite could not
    // catch before #28.
    db.client.findMany();
    expect(() => expectTotalDbCalls(db, 1)).toThrow();
  });
});

describe("expectNoDbWrites — read-only-on-GET guard (#2/#16 invariant)", () => {
  it("passes for a read-only handler", () => {
    const db = makeDb();
    db.user.findMany();
    db.client.aggregate({});

    expect(() => expectNoDbWrites(db)).not.toThrow();
  });

  it("FAILS when a GET issues a write (create)", () => {
    const db = makeDb();
    db.user.findMany();
    expect(() => expectNoDbWrites(db)).not.toThrow();

    db.user.create({ data: {} }); // write-on-GET regression
    expect(() => expectNoDbWrites(db)).toThrow();
  });

  it("FAILS when a GET issues a raw write ($executeRaw)", async () => {
    const db = makeDb();
    await db.$queryRaw`SELECT 1`;
    expect(() => expectNoDbWrites(db)).not.toThrow();

    await db.$executeRaw`UPDATE x SET y=1`;
    expect(() => expectNoDbWrites(db)).toThrow();
  });
});
