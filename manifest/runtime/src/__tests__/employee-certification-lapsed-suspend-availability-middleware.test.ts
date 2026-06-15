/**
 * Middleware conformance — `EmployeeCertificationExpired/Revoked → EmployeeAvailability.suspend`
 * (IMPLEMENTATION_PLAN P1, Core / cross-cutting orphan events, the availability-suspend leg).
 *
 * WHY this matters (not just WHAT it does): when a staff member's certification expires
 * or is revoked, the safety-correct action is to pull them off the schedule until the
 * credential is renewed. Before this middleware, a lapse left every
 * `EmployeeAvailability` row ACTIVE, so the scheduler still treated the employee as
 * available for work that may require the now-invalid credential — a compliance gap.
 * This middleware fans out a governed `EmployeeAvailability.suspend(reason)` over the
 * employee's active availability rows.
 *
 * WHY middleware, not a reaction (the crux these tests lock): it is a 1:N fan-out (one
 * lapse → every active availability row for the employee), AND `expire`/`revoke` are
 * MUTATE commands whose payload is `{ ...commandInput, result }` — the employee
 * (`EmployeeCertification.employeeId`) is the cert's OWN field, NOT an input param, and
 * declared event fields are never auto-populated from `self.*`. So no reaction can read
 * the employee FK; the middleware LOADS the cert via `_subject.id` then queries
 * availability by employeeId.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY if
 * the propagation regresses — wrong employee, no suspension, or the cascade touching
 * already-suspended/other-employee rows — i.e. it fails when the BUSINESS propagation
 * breaks, not merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that no `EmployeeCertification* → EmployeeAvailability` reaction
 * crept into the IR.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEmployeeCertificationLapsedSuspendAvailabilityMiddleware } from "../middleware/employee-certification-lapsed-suspend-availability-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-cert-suspend";
// admin satisfies EmployeeCertification's policy (hr_admin/payroll_admin/manager/admin)
// AND EmployeeAvailability's default policy (hr_admin/payroll_admin/manager/admin), so
// neither the source command nor the downstream suspend is policy-denied.
const USER = {
  id: "u-cert-suspend",
  tenantId: TENANT,
  role: "admin",
} as const;

const CERT_ID = "cert-100";
const EMPLOYEE_ID = "emp-100";
const OTHER_EMPLOYEE_ID = "emp-999";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
// Every IR entity is `durable`, so RuntimeEngine REQUIRES a storeProvider.
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

/** Build the engine with the cert-lapse→suspend-availability middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEmployeeCertificationLapsedSuspendAvailabilityMiddleware({
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

async function seedCert(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("EmployeeCertification").create({
    id: CERT_ID,
    tenantId: TENANT,
    employeeId: EMPLOYEE_ID,
    certificationType: "ServSafe Food Handler",
    certificationName: "Food Handler Card",
    issuedDate: "2024-01-01",
    expiryDate: "2026-01-01",
    documentUrl: "",
    status: "active",
    ...overrides,
  } as never);
}

/**
 * Seed an availability row. Must satisfy EmployeeAvailability's entity-level constraints
 * (requireEmployee/requireStartTime/requireEndTime/validDayOfWeek), because `suspend`'s
 * mutate-persist re-validates them — a partial seed would see the suspend silently
 * dropped (mutate-persist-dropped-by-block-constraints gotcha).
 */
async function seedAvailability(
  provider: (entity: string) => Store,
  id: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("EmployeeAvailability").create({
    id,
    tenantId: TENANT,
    employeeId: EMPLOYEE_ID,
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    effectiveFrom: "",
    effectiveUntil: "",
    isSuspended: false,
    suspendReason: "",
    ...overrides,
  } as never);
}

async function expireCert(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EmployeeCertification",
      command: "expire",
      body: { id: CERT_ID, tenantId: TENANT, userId: USER.id },
      user: { ...USER },
    }
  );
}

async function revokeCert(engine: ManifestRuntimeEngine, reason: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EmployeeCertification",
      command: "revoke",
      body: {
        id: CERT_ID,
        tenantId: TENANT,
        reason,
        revokedBy: USER.id,
        userId: USER.id,
      },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (result.ok ? result.events : [])?.map((e: any) => e?.name) ?? [];
}

async function availabilityRows(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  return (await provider("EmployeeAvailability").getAll()) as Record<
    string,
    unknown
  >[];
}

describe("Middleware conformance: EmployeeCertification lapse → EmployeeAvailability.suspend", () => {
  it("the compiled IR carries no EmployeeCertification*→EmployeeAvailability reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        (r.event === "EmployeeCertificationExpired" ||
          r.event === "EmployeeCertificationRevoked") &&
        r.targetEntity === "EmployeeAvailability"
    );
    // A regression here would mean someone added a reaction that structurally cannot
    // read the cert's own employeeId FK nor fan out 1:N — the propagation must stay
    // middleware.
    expect(stale).toHaveLength(0);
  });

  it("expiring a certification suspends every active availability row for the employee", async () => {
    const provider = makeProvider();
    await seedCert(provider);
    await seedAvailability(provider, "avail-1", { dayOfWeek: 1 });
    await seedAvailability(provider, "avail-2", { dayOfWeek: 3 });
    // A different employee's row must NOT be suspended.
    await seedAvailability(provider, "avail-other", {
      employeeId: OTHER_EMPLOYEE_ID,
      dayOfWeek: 2,
    });
    const engine = newEngine(provider);

    const result = await expireCert(engine);
    expect(result.ok).toBe(true);

    const rows = await availabilityRows(provider);
    const byId = new Map(rows.map((r) => [r.id as string, r]));
    // THE PROOF: both of the employee's rows are now suspended with the cert reason.
    expect(byId.get("avail-1")?.isSuspended).toBe(true);
    expect(byId.get("avail-2")?.isSuspended).toBe(true);
    expect(String(byId.get("avail-1")?.suspendReason)).toContain(
      "Food Handler Card"
    );
    // The other employee's availability is untouched.
    expect(byId.get("avail-other")?.isSuspended).toBe(false);

    // The cert itself transitioned to expired (the source command's effect).
    const certRow = (await provider("EmployeeCertification").getById(
      CERT_ID
    )) as Record<string, unknown>;
    expect(certRow.status).toBe("expired");

    // Secondary proof: the downstream suspend events bubble up into the parent's
    // events — only possible if the middleware executed (one per suspended row).
    const names = eventNames(result);
    expect(names).toContain("EmployeeCertificationExpired");
    expect(
      names.filter((n) => n === "EmployeeAvailabilitySuspended")
    ).toHaveLength(2);
  });

  it("revoking a certification suspends availability with the revocation reason folded in", async () => {
    const provider = makeProvider();
    await seedCert(provider);
    await seedAvailability(provider, "avail-1");
    const engine = newEngine(provider);

    const result = await revokeCert(engine, "Failed renewal audit");
    expect(result.ok).toBe(true);

    const rows = await availabilityRows(provider);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isSuspended).toBe(true);
    // `reason` is a genuine revoke param → rides the payload → folded into the reason.
    expect(String(rows[0]?.suspendReason)).toContain("Failed renewal audit");

    const certRow = (await provider("EmployeeCertification").getById(
      CERT_ID
    )) as Record<string, unknown>;
    expect(certRow.status).toBe("revoked");

    const names = eventNames(result);
    expect(names).toContain("EmployeeCertificationRevoked");
    expect(names).toContain("EmployeeAvailabilitySuspended");
  });

  it("skips already-suspended and soft-deleted availability rows (guard-safe + idempotent)", async () => {
    const provider = makeProvider();
    await seedCert(provider);
    // Already suspended — must not be re-suspended (would trip the isSuspended guard).
    await seedAvailability(provider, "avail-suspended", {
      isSuspended: true,
      suspendReason: "Prior injury",
    });
    // Soft-deleted — must be skipped (would trip the deletedAt guard).
    await seedAvailability(provider, "avail-deleted", {
      deletedAt: Date.now(),
    });
    const engine = newEngine(provider);

    const result = await expireCert(engine);
    expect(result.ok).toBe(true);

    const rows = await availabilityRows(provider);
    const byId = new Map(rows.map((r) => [r.id as string, r]));
    // The pre-suspended row keeps its original reason (untouched).
    expect(String(byId.get("avail-suspended")?.suspendReason)).toBe(
      "Prior injury"
    );
    // The deleted row stays unsuspended.
    expect(byId.get("avail-deleted")?.isSuspended).toBe(false);

    // No suspend fired for either row.
    const names = eventNames(result);
    expect(names).not.toContain("EmployeeAvailabilitySuspended");
  });

  it("is a clean no-op when the employee has no active availability rows", async () => {
    const provider = makeProvider();
    await seedCert(provider);
    // No availability rows seeded at all.
    const engine = newEngine(provider);

    const result = await expireCert(engine);
    expect(result.ok).toBe(true);

    const names = eventNames(result);
    expect(names).toContain("EmployeeCertificationExpired");
    expect(names).not.toContain("EmployeeAvailabilitySuspended");
  });
});
