/**
 * Middleware conformance — `ChartOfAccountDeactivated → deactivate child accounts`
 * (IMPLEMENTATION_PLAN: Lifecycle propagation, line 197).
 *
 * WHY this matters (not just WHAT it does): before this, `ChartOfAccountDeactivated`
 * had ZERO consumers. Deactivating a parent general-ledger account left every
 * sub-account that points at it (`parentId`) ACTIVE, so the chart of accounts kept
 * offering retired sub-accounts for posting and the `belongsTo parent` relationship
 * resolved a live child under a dead parent. The cascade closes that hole: one
 * governed `ChartOfAccount.deactivate` fans out to `deactivate` for every active,
 * non-deleted child — and, via re-entrant dispatch, the WHOLE subtree.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * cascade middleware wired (exactly as the factory wires it), so it FAILS LOUDLY when
 * the BUSINESS propagation regresses — an active child left active, a sibling/other-
 * tenant account wrongly touched, the subtree not fully retired, the engine ceasing to
 * dispatch — not merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that nobody re-expresses this 1:N fan-out as a (dead) IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createChartOfAccountDeactivatedDeactivateChildrenMiddleware } from "../middleware/chart-of-account-deactivated-deactivate-children-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-chart-of-account";
// admin satisfies ChartOfAccount's policy (finance/finance_manager/manager/admin) —
// the same policy the cascade dispatch runs under, so the actor always aligns.
const USER = { id: "u-finance", tenantId: TENANT, role: "admin" } as const;

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async clear(): Promise<void> {
    this.items.clear();
  }
}

function makeProvider(): (entity: string) => Store {
  const stores = new Map<string, Mem>();
  return (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

/** Engine wired with the chart-of-account child-deactivation cascade (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createChartOfAccountDeactivatedDeactivateChildrenMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      middleware,
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
  return engine;
}

let acctSeq = 0;
async function seedAccount(
  provider: (entity: string) => Store,
  overrides: {
    id: string;
    parentId?: string;
    isActive?: boolean;
    tenantId?: string;
    deletedAt?: number;
  }
) {
  acctSeq += 1;
  await provider("ChartOfAccount").create({
    id: overrides.id,
    tenantId: overrides.tenantId ?? TENANT,
    accountNumber: `${1000 + acctSeq}`,
    accountName: `Account ${overrides.id}`,
    accountType: "asset",
    parentId: overrides.parentId ?? "",
    description: "",
    isActive: overrides.isActive ?? true,
    ...(overrides.deletedAt == null ? {} : { deletedAt: overrides.deletedAt }),
  } as never);
}

function deactivateAccount(engine: ManifestRuntimeEngine, id: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ChartOfAccount",
      command: "deactivate",
      body: { id, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (
    (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? []
  );
}

async function isActiveOf(
  provider: (entity: string) => Store,
  id: string
): Promise<unknown> {
  const row = (await provider("ChartOfAccount").getById(id)) as Record<
    string,
    unknown
  >;
  return row?.isActive;
}

describe("Middleware conformance: ChartOfAccountDeactivated → deactivate child accounts", () => {
  it("the compiled IR carries NO ChartOfAccountDeactivated→X reaction (it is a 1:N middleware cascade)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) => r.event === "ChartOfAccountDeactivated"
    );
    // A regression here means someone tried to express this fan-out as a reaction,
    // which structurally cannot resolve the many children — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("deactivating a parent deactivates its active children, leaving siblings and other tenants alone", async () => {
    const provider = makeProvider();
    await seedAccount(provider, { id: "parent" });
    await seedAccount(provider, { id: "child-a", parentId: "parent" });
    await seedAccount(provider, { id: "child-b", parentId: "parent" });
    // A root sibling (no parent) MUST NOT be touched (negative control).
    await seedAccount(provider, { id: "sibling-root" });
    // Another tenant's child of an account with the SAME id MUST NOT be touched.
    await seedAccount(provider, {
      id: "child-other-tenant",
      parentId: "parent",
      tenantId: "t-other",
    });

    const engine = newEngine(provider);
    const result = await deactivateAccount(engine, "parent");
    expect(result.ok).toBe(true);

    // THE PROOF: the parent and both its children are now inactive.
    expect(await isActiveOf(provider, "parent")).toBe(false);
    expect(await isActiveOf(provider, "child-a")).toBe(false);
    expect(await isActiveOf(provider, "child-b")).toBe(false);
    // The unrelated root and the other tenant's child are untouched.
    expect(await isActiveOf(provider, "sibling-root")).toBe(true);
    expect(await isActiveOf(provider, "child-other-tenant")).toBe(true);

    // Secondary proof: a ChartOfAccountDeactivated bubbled up per child — only
    // possible if the cascade actually dispatched the governed deactivate command
    // (1 for the parent itself + 2 children = 3).
    const names = eventNames(result);
    expect(names.filter((n) => n === "ChartOfAccountDeactivated")).toHaveLength(
      3
    );
  });

  it("retires the WHOLE subtree via re-entrant dispatch (grandchildren too)", async () => {
    const provider = makeProvider();
    await seedAccount(provider, { id: "p" });
    await seedAccount(provider, { id: "c", parentId: "p" });
    await seedAccount(provider, { id: "gc", parentId: "c" });

    const engine = newEngine(provider);
    const result = await deactivateAccount(engine, "p");
    expect(result.ok).toBe(true);

    expect(await isActiveOf(provider, "p")).toBe(false);
    expect(await isActiveOf(provider, "c")).toBe(false);
    // The grandchild is reached because deactivating `c` re-emits the event.
    expect(await isActiveOf(provider, "gc")).toBe(false);
  });

  it("skips already-inactive and soft-deleted children (guard-safe + idempotent)", async () => {
    const provider = makeProvider();
    await seedAccount(provider, { id: "parent2" });
    await seedAccount(provider, {
      id: "child-inactive",
      parentId: "parent2",
      isActive: false,
    });
    await seedAccount(provider, {
      id: "child-deleted",
      parentId: "parent2",
      deletedAt: Date.now(),
    });
    // One genuinely-active child proves the cascade still ran (positive control).
    await seedAccount(provider, { id: "child-active", parentId: "parent2" });

    const engine = newEngine(provider);
    const result = await deactivateAccount(engine, "parent2");
    expect(result.ok).toBe(true);

    expect(await isActiveOf(provider, "child-active")).toBe(false);
    // The already-inactive and soft-deleted children are not re-dispatched: only
    // the parent + the one active child emit ChartOfAccountDeactivated (2 total).
    expect(
      eventNames(result).filter((n) => n === "ChartOfAccountDeactivated")
    ).toHaveLength(2);
  });
});
