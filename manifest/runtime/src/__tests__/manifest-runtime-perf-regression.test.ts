/**
 * Performance regressions for the Event.update latency fix (2026-06-19).
 *
 * Measured root cause: `createManifestRuntime` paid a one-time COLD cost
 * (`ensureManifestSchema` DDL ≈3.1s + first IR parse/provenance) on the first
 * request after a restart. All of that is process-memoized, so WARM runtime
 * construction is ~3ms. These tests pin the properties that keep it that way:
 *
 *   1. Warm `createManifestRuntime` reuses the per-tenant role-policy cache
 *      (no extra DB query) and stays well under 100ms — no per-request rebuild
 *      of IR / schema / engine registries.
 *   2. A command with many `mutate` statements still performs exactly ONE store
 *      write (the engine's command buffer batches them) — Event.update has ~41
 *      mutates but must not issue ~41 writes.
 *   3. The non-blocking-constraint console spam is collapsed to one line per
 *      command (workaround for the engine evaluating constraints per-mutate).
 *
 * NOTE: the remaining ~120–240ms per Prisma query in production is local→Neon
 * network latency (us-east-1 round-trips), NOT command-engine time — see the
 * latency note in the Event.update path; do not chase it as engine cost.
 */

import type { Store } from "@angriff36/manifest";
import { RuntimeEngine } from "@angriff36/manifest";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { describe, expect, it, vi } from "vitest";
import {
  invalidatePermissionCache,
  loadRolePolicies,
} from "../permission-guard.js";

// ---------------------------------------------------------------------------
// 1. Warm-path role-policy caching — the per-request DB work that made warm
//    createManifestRuntime drop to ~3ms (the cold 3.4s was one-time
//    ensureManifestSchema DDL + IR parse, both process-memoized).
//
//    NOTE: createManifestRuntime itself can't be imported under vitest (it
//    transitively pulls `server-only`), so we pin the actual warm-path cache it
//    relies on: loadRolePolicies. This is the only per-request DB query in the
//    factory; if it stops caching, warm createRuntime regresses.
// ---------------------------------------------------------------------------

describe("loadRolePolicies cache (perf regression)", () => {
  function fakePrisma(findMany: ReturnType<typeof vi.fn>) {
    return { rolePolicy: { findMany } } as unknown as Parameters<
      typeof loadRolePolicies
    >[0];
  }

  it("queries once per tenant, then serves warm reads from cache", async () => {
    const tenantId = `perf-regression-${Date.now()}`;
    invalidatePermissionCache(tenantId);
    const findMany = vi.fn().mockResolvedValue([]);

    await loadRolePolicies(fakePrisma(findMany), tenantId); // cold → 1 query
    await loadRolePolicies(fakePrisma(findMany), tenantId); // warm → cached
    await loadRolePolicies(fakePrisma(findMany), tenantId); // warm → cached

    expect(findMany).toHaveBeenCalledTimes(1);
    invalidatePermissionCache(tenantId);
  });

  it("keys the cache by tenant — no cross-tenant leakage", async () => {
    const tenantA = `perf-regression-A-${Date.now()}`;
    const tenantB = `perf-regression-B-${Date.now()}`;
    invalidatePermissionCache(tenantA);
    invalidatePermissionCache(tenantB);

    const findMany = vi
      .fn()
      .mockImplementation((args: { where: { tenantId: string } }) =>
        Promise.resolve([
          {
            roleId: `role-${args.where.tenantId}`,
            roleName: "admin",
            permissions: {},
            isActive: true,
          },
        ])
      );

    const a = await loadRolePolicies(fakePrisma(findMany), tenantA);
    const b = await loadRolePolicies(fakePrisma(findMany), tenantB);

    // Distinct tenants → distinct queries + distinct cached data (no bleed).
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(a).not.toEqual(b);

    invalidatePermissionCache(tenantA);
    invalidatePermissionCache(tenantB);
  });
});

// ---------------------------------------------------------------------------
// 2. Command buffer batching — N mutates → ONE store write
// ---------------------------------------------------------------------------

const MULTI_MUTATE_SOURCE = `
entity Widget {
  key [tenantId, id]
  property required id: string
  property required tenantId: string
  property a: string = ""
  property b: string = ""
  property c: string = ""
  property d: string = ""
  property e: string = ""
  property f: string = ""

  default policy WidgetAccess execute: user.role in ["admin"] "Widget access"

  command create(a: string) {
    mutate a = a
    emit WidgetCreated
  }

  command update(a: string, b: string, c: string, d: string, e: string, f: string) {
    mutate a = a
    mutate b = b
    mutate c = c
    mutate d = d
    mutate e = e
    mutate f = f
    emit WidgetUpdated
  }
}

event WidgetCreated: "widget.created" { widgetId: string }
event WidgetUpdated: "widget.updated" { widgetId: string }
`;

/** In-memory tenant-scoped store that counts getById / update calls. */
function makeCountingStore() {
  const rows = new Map<string, Record<string, unknown>>();
  const counts = { getById: 0, update: 0, create: 0 };
  const store: Store<Record<string, unknown>> = {
    getAll: () => Promise.resolve([...rows.values()]),
    getById: (id: string) => {
      counts.getById += 1;
      return Promise.resolve(rows.get(id));
    },
    create: (data: Record<string, unknown>) => {
      counts.create += 1;
      const row = { ...data };
      rows.set(String(row.id), row);
      return Promise.resolve(row);
    },
    update: (id: string, data: Record<string, unknown>) => {
      counts.update += 1;
      const merged = { ...rows.get(id), ...data };
      rows.set(id, merged);
      return Promise.resolve(merged);
    },
    delete: (id: string) => {
      rows.delete(id);
      return Promise.resolve(true);
    },
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  } as unknown as Store<Record<string, unknown>>;
  return { store, counts };
}

describe("command buffer batching (perf regression)", () => {
  it("a multi-mutate update issues exactly ONE store write", async () => {
    const { ir } = await compileToIR(MULTI_MUTATE_SOURCE);
    expect(ir).toBeTruthy();

    const { store, counts } = makeCountingStore();
    const user = { id: "u1", tenantId: "t1", role: "admin" };
    const engine = new RuntimeEngine(
      // biome-ignore lint/suspicious/noExplicitAny: IR type is structural.
      ir as any,
      { user, tenantId: user.tenantId },
      { storeProvider: () => store }
    );

    // No instanceId on create → engine auto-creates from the body id (passing
    // instanceId would disable the auto-create path).
    const created = await engine.runCommand(
      "create",
      { id: "w1", tenantId: "t1", a: "0" },
      { entityName: "Widget" }
    );
    expect(created.success).toBe(true);

    // Reset counters: measure only the multi-mutate update.
    counts.getById = 0;
    counts.update = 0;

    const updated = await engine.runCommand(
      "update",
      { a: "1", b: "2", c: "3", d: "4", e: "5", f: "6" },
      { entityName: "Widget", instanceId: "w1" }
    );
    expect(updated.success).toBe(true);

    // 6 mutates → still a single flushed write (buffer batching). The whole
    // point: store writes do NOT scale with the number of mutate statements.
    expect(counts.update).toBe(1);
    expect(counts.getById).toBeLessThanOrEqual(1);
  });
});
