/**
 * Middleware conformance — `StaffMemberCreated → TrainingAssignment.create`
 * (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): every new staff member must be
 * auto-assigned the mandatory SEL event-staff onboarding training ("Must be
 * completed before first shift"). This was a SILENT NO-OP: the old
 * `on StaffMemberCreated run TrainingAssignment.create` reaction read
 * `payload.staffMemberId` / `payload.firstShiftAt` / `payload.dueAt`, but
 * `StaffMember.create` is a MUTATE command, so the engine's emitted payload
 * `{ ...commandInput, result }` carries `result` = the last mutate's scalar, NOT
 * the instance. `staffMemberId` is a COMPUTED (`self.id`) and firstShiftAt/dueAt
 * are not knowable at create time — none are `create` params, so all three were
 * `undefined` and NO assignment was ever created. The reaction also passed
 * `staffRole: payload.role`, but `TrainingAssignment.create` guards
 * `staffRole == "staff"` while role defaults to "server", so it would have been
 * blocked anyway. The fix replaces the dead reaction with middleware that reads
 * the new id from `_subject.id`, pins `staffRole = "staff"`, and dispatches the
 * governed `TrainingAssignment.create`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS
 * LOUDLY if the propagation regresses — no assignment created, wrong field
 * mapping, or the engine stops dispatching — i.e. it fails when the BUSINESS
 * propagation breaks, not merely on a shape change (CLAUDE.md Rule 9;
 * constitution §13). It also regression-locks that (a) the broken reaction did
 * not creep back into the IR and (b) the duplicate `StaffMemberCreated` event
 * definition stays collapsed to one.
 *
 * Chain proven here:
 *   StaffMember.create(displayName=…, role="server")
 *     → emits StaffMemberCreated (_subject.id = the new staff member id)
 *     → middleware dispatches TrainingAssignment.create(staffMemberId, staffRole="staff",
 *       SEL module, dueDateReviewNeeded=true)
 *     → a new TrainingAssignment row is persisted, TrainingAssignmentCreated bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createStaffMemberCreatedTrainingAssignmentMiddleware } from "../middleware/staff-member-created-training-assignment-middleware.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const SEL_MODULE_ID = "training-module-sel-event-staff-onboarding";

const TENANT = "t-staff-onboard";
// admin satisfies StaffMember.create's policy AND the middleware's
// TrainingAssignment.create dispatch policy so neither is denied.
const USER = { id: "u-hr", tenantId: TENANT, role: "admin" } as const;

const STAFF_ID = "staff-onboard-001";

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

/** Build the engine with the staff-onboarding middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createStaffMemberCreatedTrainingAssignmentMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* no-op in tests */
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

async function createStaff(
  engine: ManifestRuntimeEngine,
  body: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "StaffMember",
      command: "create",
      body: {
        id: STAFF_ID,
        tenantId: TENANT,
        displayName: "Alex Rivera",
        email: "alex@example.com",
        phone: "",
        // A typical staff role — NOT "staff". The middleware must still assign
        // the onboarding (it pins the assignment's staffRole to "staff").
        role: "server",
        ...body,
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: StaffMemberCreated → TrainingAssignment.create", () => {
  it("the compiled IR no longer carries the broken reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "StaffMemberCreated" &&
        r.targetEntity === "TrainingAssignment" &&
        r.targetCommand === "create"
    );
    // A regression here means someone re-added the dead `payload.*` reaction; the
    // propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("StaffMemberCreated is defined exactly once (the duplicate stub is removed)", () => {
    const defs: Record<string, unknown>[] = (ir.events ?? []).filter(
      (e: Record<string, unknown>) => e.name === "StaffMemberCreated"
    );
    expect(defs).toHaveLength(1);
    // The surviving definition is the real one StaffMember.create emits.
    expect(defs[0].channel).toBe("staff.staff-member.created");
  });

  it("creating a staff member auto-assigns the SEL onboarding training", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const result = await createStaff(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran TrainingAssignment.create against the SAME
    // store, so a new onboarding assignment now exists for the staff member.
    const assignments = (await provider(
      "TrainingAssignment"
    ).getAll()) as Record<string, unknown>[];
    expect(assignments).toHaveLength(1);
    const assignment = assignments[0];
    // create mutates employeeId = staffMemberId — _subject.id, NOT the unreachable
    // computed the reaction tried to read.
    expect(assignment.employeeId).toBe(STAFF_ID);
    expect(assignment.moduleId).toBe(SEL_MODULE_ID);
    // staffRole pinned to "staff" so the create's `staffRole == "staff"` guard
    // passes (the reaction's `payload.role` = "server" would have blocked it).
    expect(assignment.staffRole).toBe("staff");
    expect(assignment.status).toBe("assigned");
    // The due date is flagged for review — it is pinned later when the first
    // shift is scheduled (applyFirstShiftDueDate), not at staff-create time.
    expect(assignment.dueDateReviewNeeded).toBe(true);

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("StaffMemberCreated");
    expect(eventNames).toContain("TrainingAssignmentCreated");
  });

  it("does not create a second assignment when one already exists (idempotent)", async () => {
    const provider = makeProvider();
    // Pre-existing onboarding assignment for the same staff member + module.
    await provider("TrainingAssignment").create({
      id: "assignment-pre-existing",
      tenantId: TENANT,
      moduleId: SEL_MODULE_ID,
      employeeId: STAFF_ID,
      staffRole: "staff",
      status: "in_progress",
      attemptCount: 1,
      passThresholdPercent: 80,
      maxAttempts: 3,
    } as never);
    const engine = newEngine(provider);

    const result = await createStaff(engine);
    expect(result.ok).toBe(true);

    const assignments = (await provider(
      "TrainingAssignment"
    ).getAll()) as Record<string, unknown>[];
    expect(assignments).toHaveLength(1);
    expect(assignments[0].id).toBe("assignment-pre-existing");
  });
});
