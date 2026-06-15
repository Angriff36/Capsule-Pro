/**
 * Middleware conformance — `PayrollRunPaid → PayrollPeriod.lock`
 * (IMPLEMENTATION_PLAN P1 "PayrollRunPaid → lock period / close tip pool / notify").
 *
 * WHY this matters (not just WHAT it does): once a payroll run is marked PAID, its pay
 * period must become immutable — otherwise the period can still be reopened and time
 * entries re-edited, so paid payroll could be retroactively altered. `PayrollRunPaid`
 * had ZERO consumers, so a paid period stayed `closed`/`open` and editable. This
 * middleware closes the loop (the lock leg of the plan item; the TipPool/notify legs are
 * separate increments). It CANNOT be a reaction: `PayrollRun.markPaid()` takes NO params
 * and is a MUTATE, so the engine payload `{ ...commandInput, result }` carries only a
 * `paidAt` scalar; the period to lock is `PayrollRun.payrollPeriodId` — the run's OWN
 * field, never auto-populated onto the event. The middleware loads the run via
 * `_subject.id` and dispatches the governed `PayrollPeriod.lock`.
 *
 * It is GUARD-SAFE by design: `PayrollPeriod.lock()` guards `self.status == "closed"`
 * (FSM closed→locked only). A period that is already `locked` (a second run paid against
 * it) or still `open` (paid before being closed — anomalous) is skipped cleanly, never a
 * swallowed transition failure. The tests pin the happy path (closed → locked) and the
 * open-period skip so the guard-safety can't silently regress.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation or the source FSMs regress.
 *
 * @vitest-environment node
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPayrollRunPaidPeriodLockMiddleware } from "../middleware/payroll-run-paid-period-lock-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-payroll-lock";
const PERIOD_ID = "period-lock-1";
const RUN_ID = "run-lock-1";

const USER = {
  id: "user-payroll-1",
  tenantId: TENANT,
  role: "admin",
} as const;

class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  async getAll(): Promise<never> {
    return Array.from(this.items.values()) as never;
  }
  async getById(id: string): Promise<never> {
    return this.items.get(id) as never;
  }
  async create(data: Record<string, unknown>): Promise<never> {
    const id = (data.id as string) ?? randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async update(id: string, data: Record<string, unknown>): Promise<never> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<never> {
    return this.items.delete(id) as never;
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

function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPayrollRunPaidPeriodLockMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn diagnostics in tests */
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

async function seedPeriod(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("PayrollPeriod").create({
    id: PERIOD_ID,
    tenantId: TENANT,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-15",
    // A period is closed before payroll runs against it; lock() requires "closed".
    status: "closed",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedRun(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("PayrollRun").create({
    id: RUN_ID,
    tenantId: TENANT,
    payrollPeriodId: PERIOD_ID,
    runDate: "2026-06-16",
    // markPaid() guards status == "approved".
    status: "approved",
    totalGross: 10_000,
    totalDeductions: 2_000,
    totalNet: 8_000,
    approvedBy: USER.id,
    deletedAt: null,
    ...overrides,
  } as never);
}

function markPaid(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "PayrollRun",
      command: "markPaid",
      body: {
        id: RUN_ID,
        tenantId: TENANT,
      },
      user: { ...USER },
    }
  );
}

describe("PayrollRunPaid → PayrollPeriod.lock middleware", () => {
  it("the IR carries no PayrollRunPaid reaction (it is middleware) AND both source FSMs allow the path (markPaid: approved→paid, lock: closed→locked)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) => r.event === "PayrollRunPaid");
    expect(stale).toHaveLength(0);

    const run = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "PayrollRun"
    );
    const runTransitions: { from?: string; to?: string[] }[] =
      run?.transitions ?? [];
    // markPaid mutates status -> paid; approved must reach it or markPaid is dead.
    expect(
      runTransitions.find((t) => t.from === "approved")?.to ?? []
    ).toContain("paid");

    const period = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "PayrollPeriod"
    );
    const periodTransitions: { from?: string; to?: string[] }[] =
      period?.transitions ?? [];
    // lock mutates status -> locked; closed must reach it or lock is dead.
    expect(
      periodTransitions.find((t) => t.from === "closed")?.to ?? []
    ).toContain("locked");
  });

  it("locks the pay period when its run is marked paid (period reaches locked)", async () => {
    const provider = makeProvider();
    await seedPeriod(provider);
    await seedRun(provider);
    const engine = newEngine(provider);

    const result = await markPaid(engine);
    expect(result.ok).toBe(true);

    // The source command fires — run is paid.
    const paidRun = (await provider("PayrollRun").getById(RUN_ID)) as {
      status?: string;
      paidAt?: unknown;
    };
    expect(paidRun.status).toBe("paid");
    expect(paidRun.paidAt).toBeTruthy();

    // The propagation locked the period — paid payroll is now immutable.
    const lockedPeriod = (await provider("PayrollPeriod").getById(
      PERIOD_ID
    )) as { status?: string };
    expect(lockedPeriod.status).toBe("locked");
  });

  it("leaves a still-open period untouched (lock guards status==closed — never a swallowed failure)", async () => {
    const provider = makeProvider();
    // Anomalous but possible: a run paid against a period that was never closed.
    await seedPeriod(provider, { status: "open" });
    await seedRun(provider);
    const engine = newEngine(provider);

    const result = await markPaid(engine);
    expect(result.ok).toBe(true);

    const paidRun = (await provider("PayrollRun").getById(RUN_ID)) as {
      status?: string;
    };
    expect(paidRun.status).toBe("paid");

    // lock()'s guard (status == "closed") is mirrored — open period is skipped.
    const stillOpen = (await provider("PayrollPeriod").getById(PERIOD_ID)) as {
      status?: string;
    };
    expect(stillOpen.status).toBe("open");
  });

  it("skips cleanly when the run has no payrollPeriodId (run still pays, no crash, no period touched)", async () => {
    const provider = makeProvider();
    await seedPeriod(provider);
    await seedRun(provider, { payrollPeriodId: "" });
    const engine = newEngine(provider);

    const result = await markPaid(engine);
    expect(result.ok).toBe(true);

    const paidRun = (await provider("PayrollRun").getById(RUN_ID)) as {
      status?: string;
    };
    expect(paidRun.status).toBe("paid");

    // No period was targeted — the seeded closed period is untouched.
    const untouched = (await provider("PayrollPeriod").getById(PERIOD_ID)) as {
      status?: string;
    };
    expect(untouched.status).toBe("closed");
  });
});
