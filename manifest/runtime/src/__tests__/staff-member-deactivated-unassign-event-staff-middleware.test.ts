/**
 * Middleware conformance — `StaffMemberDeactivated → unassign open EventStaff`
 * (IMPLEMENTATION_PLAN P1, Staffing → "StaffMemberDeactivated → unassign future
 * work").
 *
 * WHY this matters (not just WHAT it does): deactivating a staff member must take
 * them OFF the event assignments they have not yet worked. Until this propagation
 * existed, `StaffMemberDeactivated` had no consumer, so deactivation flipped only
 * the staff member's own status and left every `assigned`/`confirmed` EventStaff
 * row live — the event staffing sheet kept showing a person who can no longer work
 * as still rostered, a stale double-booking a coordinator had to clean up by hand.
 * The plan scoped this as middleware (not a reaction) because it is a 1:N fan-out
 * (one staff member → many assignments). It is scoped to EventStaff ONLY because
 * `EventStaff.staffMemberId belongsTo StaffMember` (same id space) while
 * `ScheduleShift.employeeId belongsTo User` (a different id space) — a ScheduleShift
 * leg keyed on the StaffMember id would be an identity mismatch.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the
 * middleware wired (the middleware lives in the factory, not the IR), so it FAILS
 * LOUDLY if the propagation regresses — no unassign, the wrong assignment touched,
 * or an already-worked/already-unassigned assignment touched — i.e. it fails when
 * the BUSINESS propagation breaks, not on a mere shape change (CLAUDE.md Rule 9;
 * constitution §13).
 *
 * Chain proven here:
 *   StaffMember.deactivate(reason)  (status active → inactive)
 *     → emits StaffMemberDeactivated (_subject.id = the staff member id)
 *     → middleware scans this staff member's EventStaff rows and unassigns the
 *       ones still in a pre-work state (assigned/confirmed)
 *     → EventStaff rows move to status "unassigned", EventStaffUnassigned bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createStaffMemberDeactivatedUnassignEventStaffMiddleware } from "../middleware/staff-member-deactivated-unassign-event-staff-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-staff-deactivate";
// manager is in the intersection of StaffMember.deactivate's default policy
// (hr_admin/payroll_admin/manager/admin) AND EventStaff's default policy
// (staff/event_coordinator/catering_manager/event_manager/manager/admin), so
// neither the source command nor the downstream unassign dispatch is denied.
const USER = { id: "u-mgr", tenantId: TENANT, role: "manager" } as const;

const STAFF_ID = "staff-001";

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

/** Build the engine with the StaffMemberDeactivated→EventStaff-unassign middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createStaffMemberDeactivatedUnassignEventStaffMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence console diagnostics in tests */
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

/**
 * Seed an ACTIVE StaffMember. Seeding the precondition is infrastructure setup;
 * the behaviour under test is the deactivate → unassign propagation, which runs
 * through the real engine below.
 */
async function seedStaff(provider: (entity: string) => Store) {
  await provider("StaffMember").create({
    id: STAFF_ID,
    tenantId: TENANT,
    displayName: "Alex Rivera",
    email: "",
    phone: "",
    role: "server",
    status: "active",
    notes: "",
    deletedAt: null,
  } as never);
}

async function seedAssignment(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown>
) {
  const id = (overrides.id as string) ?? randomUUID();
  await provider("EventStaff").create({
    id,
    tenantId: TENANT,
    eventId: "event-1",
    staffMemberId: STAFF_ID,
    role: "server",
    notes: "",
    shiftStart: null,
    shiftEnd: null,
    status: "assigned",
    confirmedAt: null,
    checkedInAt: null,
    checkedOutAt: null,
    noShowReason: "",
    deletedAt: null,
    ...overrides,
  } as never);
  return id;
}

async function deactivate(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "StaffMember",
      command: "deactivate",
      body: { id: STAFF_ID, tenantId: TENANT, reason: "left the company" },
      user: { ...USER },
    }
  );
}

async function assignmentsOf(provider: (entity: string) => Store) {
  return (await provider("EventStaff").getAll()) as Record<string, unknown>[];
}

describe("Middleware conformance: StaffMemberDeactivated → unassign open EventStaff", () => {
  it("the compiled IR carries no StaffMemberDeactivated→EventStaff reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "StaffMemberDeactivated" && r.targetEntity === "EventStaff"
    );
    // A regression here means someone added a reaction that cannot fan out to the
    // many open assignments — the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("deactivating a staff member unassigns their assigned/confirmed assignments, leaving worked/terminal ones intact", async () => {
    const provider = makeProvider();
    await seedStaff(provider);
    // Open assignments (must be unassigned): one assigned, one confirmed.
    const assigned = await seedAssignment(provider, {
      id: "es-assigned",
      status: "assigned",
    });
    const confirmed = await seedAssignment(provider, {
      id: "es-confirmed",
      status: "confirmed",
    });
    // Already-worked / terminal assignments (must survive): checked_out + no_show.
    const checkedOut = await seedAssignment(provider, {
      id: "es-checked-out",
      status: "checked_out",
      checkedInAt: 1,
      checkedOutAt: 2,
    });
    const noShow = await seedAssignment(provider, {
      id: "es-no-show",
      status: "no_show",
    });
    const engine = newEngine(provider);

    const result = await deactivate(engine);
    expect(result.ok).toBe(true);

    const byId = new Map((await assignmentsOf(provider)).map((a) => [a.id, a]));
    // THE PROOF: only the two pre-work assignments flipped to "unassigned".
    expect(byId.get(assigned)!.status).toBe("unassigned");
    expect(byId.get(confirmed)!.status).toBe("unassigned");
    expect(byId.get(checkedOut)!.status).toBe("checked_out");
    expect(byId.get(noShow)!.status).toBe("no_show");
    // The deactivation reason is carried into the unassigned assignment's notes.
    expect(byId.get(assigned)!.notes).toContain("left the company");

    // Secondary proof: the downstream command's event bubbles up — only possible
    // if the middleware executed and dispatched the unassigns.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("StaffMemberDeactivated");
    expect(eventNames).toContain("EventStaffUnassigned");
  });

  it("does not touch another staff member's open assignment", async () => {
    const provider = makeProvider();
    await seedStaff(provider);
    const mine = await seedAssignment(provider, { id: "es-mine" });
    // A different staff member's assignment must be untouched.
    const theirs = await seedAssignment(provider, {
      id: "es-theirs",
      staffMemberId: "staff-other",
    });
    const engine = newEngine(provider);

    const result = await deactivate(engine);
    expect(result.ok).toBe(true);

    const byId = new Map((await assignmentsOf(provider)).map((a) => [a.id, a]));
    expect(byId.get(mine)!.status).toBe("unassigned");
    expect(byId.get(theirs)!.status).toBe("assigned");
  });

  it("is idempotent: an already-unassigned assignment is left as-is (no re-unassign churn)", async () => {
    const provider = makeProvider();
    await seedStaff(provider);
    // An assignment already unassigned before deactivation (terminal state).
    const already = await seedAssignment(provider, {
      id: "es-already-unassigned",
      status: "unassigned",
      notes: "manually removed earlier",
    });
    const active = await seedAssignment(provider, { id: "es-active" });
    const engine = newEngine(provider);

    const result = await deactivate(engine);
    expect(result.ok).toBe(true);

    const byId = new Map((await assignmentsOf(provider)).map((a) => [a.id, a]));
    // The open assignment is unassigned; the already-unassigned one keeps its
    // original notes (the middleware filtered it out, so unassign never re-ran).
    expect(byId.get(active)!.status).toBe("unassigned");
    expect(byId.get(already)!.notes).toBe("manually removed earlier");
  });
});
