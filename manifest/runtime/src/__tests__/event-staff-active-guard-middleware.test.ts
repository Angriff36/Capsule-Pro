/**
 * Middleware conformance — EventStaff.assign blocked when StaffMember is inactive
 * (IMPLEMENTATION_PLAN P1 "cross-entity constraints": EventStaff.staffMustBeActive).
 *
 * WHY this matters (not just WHAT it does): assigning a deactivated (or removed)
 * staff member to an event is a correctness/scheduling bug — the person can no
 * longer work, but `EventStaff.assign`'s own guards only null-check the ids. The
 * rule "the staff must be active" is a CROSS-ENTITY precondition that depends on
 * the linked `StaffMember.status`. The Manifest DSL CANNOT express it as a
 * constraint/guard: those expressions see only `self.*`, `user.*`, `context.*`,
 * and command params — never another entity's live state. So the only faithful
 * mechanism is a `before-guard` runtime middleware that loads the StaffMember and
 * short-circuits the command. The plan's "Mechanism: cross-entity constraint"
 * label is therefore not literally achievable; this is the documented escape
 * hatch (middleware) for multi-hop derivations.
 *
 * These tests drive the REAL EventStaff.assign command through the runtime engine
 * WITH the middleware wired, so they FAIL LOUDLY if the guard regresses — an
 * inactive staff slipping through, or (the inverse failure) the middleware
 * over-reaching and blocking a legitimate active assignment or a different
 * command (CLAUDE.md Rule 9; constitution §13).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventStaffActiveGuardMiddleware } from "../middleware/event-staff-active-guard-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-eventstaff-active";
// admin satisfies the EventStaff default policy.
const USER = { id: "u-eventstaff", tenantId: TENANT, role: "admin" } as const;

const EVENT = "evt-active-guard";
const STAFF = "staff-active-guard";
const EVENTSTAFF = "es-active-guard";

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
    const id = (data.id as string) ?? randomUUID();
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

function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  const middleware = [
    createEventStaffActiveGuardMiddleware({
      storeProvider: provider,
      onDiagnostic: () => {
        /* no-op in tests */
      },
    }),
  ];
  return new ManifestRuntimeEngine(
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
}

async function seedStaff(
  provider: (entity: string) => Store,
  status: string,
  extra: Record<string, unknown> = {}
) {
  await provider("StaffMember").create({
    id: STAFF,
    tenantId: TENANT,
    displayName: "Test Staff",
    email: "staff@example.com",
    role: "server",
    status,
    ...extra,
  } as never);
}

async function seedEventStaff(provider: (entity: string) => Store) {
  await provider("EventStaff").create({
    id: EVENTSTAFF,
    tenantId: TENANT,
    eventId: EVENT,
    staffMemberId: STAFF,
    role: "Server",
    status: "assigned",
  } as never);
}

function runEventStaff(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventStaff",
      command,
      body: { id: EVENTSTAFF, tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: EventStaff.assign requires an active StaffMember", () => {
  it("BLOCKS assign when the staff member is deactivated (status != active)", async () => {
    const provider = makeProvider();
    await seedStaff(provider, "inactive");
    await seedEventStaff(provider);
    const engine = newEngine(provider);

    const result = await runEventStaff(engine, "assign", {
      eventId: EVENT,
      staffMemberId: STAFF,
      role: "Server",
      notes: "",
      shiftStart: new Date(1_700_000_000_000).toISOString(),
      shiftEnd: new Date(1_700_000_000_000).toISOString(),
    });

    // The short-circuit returns success:false; the assign never runs.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("not active");
    }
  });

  it("BLOCKS assign when the staff member is soft-deleted (deletedAt set)", async () => {
    const provider = makeProvider();
    // status is still "active" but the row is tombstoned — must still block.
    await seedStaff(provider, "active", {
      deletedAt: new Date().toISOString(),
    });
    await seedEventStaff(provider);
    const engine = newEngine(provider);

    const result = await runEventStaff(engine, "assign", {
      eventId: EVENT,
      staffMemberId: STAFF,
      role: "Server",
      notes: "",
      shiftStart: new Date(1_700_000_000_000).toISOString(),
      shiftEnd: new Date(1_700_000_000_000).toISOString(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("removed");
    }
  });

  it("ALLOWS assign when the staff member is active", async () => {
    const provider = makeProvider();
    await seedStaff(provider, "active");
    // Do NOT pre-seed the EventStaff row: assign bootstraps a fresh assignment
    // (initial → "assigned" is a legal transition). Pre-seeding it as already
    // "assigned" would trip an UNRELATED self-transition rejection in the engine
    // and mask the actual thing under test (that the active-guard lets it pass).
    const engine = newEngine(provider);

    const result = await runEventStaff(engine, "assign", {
      eventId: EVENT,
      staffMemberId: STAFF,
      role: "Server",
      notes: "",
      shiftStart: new Date(1_700_000_000_000).toISOString(),
      shiftEnd: new Date(1_700_000_000_000).toISOString(),
    });

    // Active staff → the middleware is a no-op and the command runs to success.
    expect(result.ok).toBe(true);
  });

  it("does NOT block a DIFFERENT command (updateRole) for a deactivated staff member", async () => {
    const provider = makeProvider();
    await seedStaff(provider, "inactive");
    await seedEventStaff(provider);
    const engine = newEngine(provider);

    // Scope proof: the guard fires only on `assign`. Re-roling an already-made
    // assignment must not be blocked just because the staff was later deactivated.
    const result = await runEventStaff(engine, "updateRole", {
      role: "Lead Server",
    });

    expect(result.ok).toBe(true);
  });
});
