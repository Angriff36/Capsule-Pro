/**
 * Middleware conformance — `EmployeeCertificationExpired/Revoked → Notification.create`
 * (IMPLEMENTATION_PLAN P1, Core / cross-cutting orphan events).
 *
 * WHY this matters (not just WHAT it does): a staff member's certification going
 * invalid — expiring on its date, or being revoked — is a compliance + safety event.
 * `EmployeeCertification.expire()` / `revoke(reason, revokedBy)` flip the cert row and
 * emit `EmployeeCertificationExpired` / `EmployeeCertificationRevoked`, but until this
 * middleware existed BOTH events had ZERO consumers: the lapse fired nothing, the
 * employee was never told to renew, and `/notifications` was blind to the gap. The
 * middleware notifies the affected employee.
 *
 * WHY middleware, not a reaction (the crux this test locks): `expire`/`revoke` are
 * MUTATE commands, so the engine's emitted payload `{ ...commandInput, result }`
 * carries the last mutate's scalar, NOT the certification instance. The recipient is
 * `EmployeeCertification.employeeId` — the cert's OWN field, NOT an `expire`/`revoke`
 * input param — and declared event fields are never auto-populated from `self.*`. So
 * NO reaction can read the recipient FK; the middleware LOADS the cert via
 * `_subject.id` and reads `self.employeeId`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY
 * if the propagation regresses — no one notified, wrong recipient, or the engine
 * stops dispatching — i.e. it fails when the BUSINESS propagation breaks, not merely
 * on a shape change (CLAUDE.md Rule 9; constitution §13). It also regression-locks
 * that no `EmployeeCertification* → Notification` reaction crept into the IR.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEmployeeCertificationLapsedNotifyMiddleware } from "../middleware/employee-certification-lapsed-notify-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-cert-lapse";
// admin satisfies EmployeeCertification's policy (hr_admin/payroll_admin/manager/admin)
// AND Notification.create's default policy (manager/admin), so neither the source
// command nor the downstream notify is policy-denied.
const USER = {
  id: "u-cert-lapse",
  tenantId: TENANT,
  role: "admin",
} as const;

const CERT_ID = "cert-001";
const EMPLOYEE_ID = "emp-001";

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

/** Build the engine with the cert-lapse→notify middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEmployeeCertificationLapsedNotifyMiddleware({
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
  // The entity-level constraints require non-empty employeeId/type/name/issuedDate
  // (they re-validate on the lapse command's mutate-persist); seed a fully-valid,
  // active certification linked to an employee.
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

async function notifications(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  return (await provider("Notification").getAll()) as Record<string, unknown>[];
}

describe("Middleware conformance: EmployeeCertification lapse → Notification.create", () => {
  it("the compiled IR carries no EmployeeCertification*→Notification reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        (r.event === "EmployeeCertificationExpired" ||
          r.event === "EmployeeCertificationRevoked") &&
        r.targetEntity === "Notification"
    );
    // A regression here would mean someone added a reaction that structurally
    // cannot read the cert's own employeeId FK — the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("expiring a certification notifies the affected employee", async () => {
    const provider = makeProvider();
    await seedCert(provider);
    const engine = newEngine(provider);

    const result = await expireCert(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Notification.create against the same store.
    const rows = await notifications(provider);
    expect(rows).toHaveLength(1);
    const notif = rows[0];
    expect(notif.recipientEmployeeId).toBe(EMPLOYEE_ID);
    expect(notif.notificationType).toBe("certification_expired");
    expect(notif.correlationId).toBe(CERT_ID);
    expect(String(notif.title)).toContain("Food Handler Card");

    // The cert itself transitioned to expired (the source command's effect).
    const certRow = (await provider("EmployeeCertification").getById(
      CERT_ID
    )) as Record<string, unknown>;
    expect(certRow.status).toBe("expired");

    // Secondary proof: the downstream event bubbles up into the parent's events —
    // only possible if the middleware executed.
    const names = eventNames(result);
    expect(names).toContain("EmployeeCertificationExpired");
    expect(names).toContain("NotificationCreated");
  });

  it("revoking a certification notifies the employee with the revocation reason", async () => {
    const provider = makeProvider();
    await seedCert(provider);
    const engine = newEngine(provider);

    const result = await revokeCert(engine, "Failed renewal audit");
    expect(result.ok).toBe(true);

    const rows = await notifications(provider);
    expect(rows).toHaveLength(1);
    const notif = rows[0];
    expect(notif.recipientEmployeeId).toBe(EMPLOYEE_ID);
    expect(notif.notificationType).toBe("certification_revoked");
    // `reason` is a genuine revoke param → rides the payload → folded into the body.
    expect(String(notif.body)).toContain("Failed renewal audit");

    const certRow = (await provider("EmployeeCertification").getById(
      CERT_ID
    )) as Record<string, unknown>;
    expect(certRow.status).toBe("revoked");

    const names = eventNames(result);
    expect(names).toContain("EmployeeCertificationRevoked");
    expect(names).toContain("NotificationCreated");
  });

  it("notifies no one when the certification has no linked employee (clean skip)", async () => {
    const provider = makeProvider();
    await seedCert(provider, { employeeId: "" });
    const engine = newEngine(provider);

    const result = await expireCert(engine);
    expect(result.ok).toBe(true);

    // No recipient to resolve → the middleware skips rather than fabricating a
    // notification with an empty recipient (which Notification.create would reject).
    const rows = await notifications(provider);
    expect(rows).toHaveLength(0);

    const names = eventNames(result);
    expect(names).not.toContain("NotificationCreated");
  });
});
