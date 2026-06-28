/**
 * Middleware conformance — `TimecardEditApproved → TimeEntry.applyEdit`
 * (IMPLEMENTATION_PLAN P1).
 *
 * WHY this matters (not just WHAT it does): approving a timecard edit request is
 * supposed to push the corrected clock times back onto the actual TimeEntry so payroll
 * and labor reporting use the fixed hours. Before this, `TimecardEditRequest.approve`
 * only `mutate status = "approved"` + emitted `TimecardEditApproved` — the corrected
 * values (`requestedClockIn/Out`, `requestedBreakMinutes`) and the target `timeEntryId`
 * are the REQUEST's OWN fields, and `approve(userId)` takes none of them as params, so
 * the engine's `{ ...commandInput, result }` payload could never carry them and NO
 * reaction could apply the edit. Approved corrections were silently dropped.
 *
 * The fix is a `TimeEntry.applyEdit` command + middleware that LOADS the approved
 * request, reads its own fields, and dispatches the governed `applyEdit`. The test runs
 * against the REAL compiled IR through the runtime engine WITH the middleware wired
 * (middleware lives in the factory, not the IR), so it FAILS LOUDLY if the propagation
 * regresses — edit never applied, wrong target, or the engine stops dispatching — i.e.
 * it fails when the BUSINESS propagation breaks, not on a mere shape change (CLAUDE.md
 * Rule 9; constitution §13). It also regression-locks that `applyEdit` exists in the IR.
 *
 * Chain proven here:
 *   TimecardEditRequest.approve(userId)  (request "pending", entry exists)
 *     → emits TimecardEditApproved (_subject.id = the request id)
 *     → middleware loads the request, reads timeEntryId + requested values
 *     → only if the linked TimeEntry is not deleted: dispatch TimeEntry.applyEdit
 *     → the TimeEntry row gets the corrected clock times, TimeEntryEdited bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { createTimecardEditApprovedTimeEntryApplyMiddleware } from "../middleware/timecard-edit-approved-time-entry-apply-middleware.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-timecard-edit";
// The "Admin" role (as named in the IR roles graph) grants the `manageAccess`
// permission, which TimecardEditRequest.approve AND TimeEntry.applyEdit both gate on
// via `roleAllows(user.role, "manageAccess")`. roleAllows resolves the role by EXACT
// name (case-sensitive `roleIndex.get(roleName)` upstream), so the role must be the
// capitalized IR role name "Admin" — lowercase "admin" is not in the role graph and
// would be policy-denied before any mutate/emit runs.
const USER = { id: "u-timecard-mgr", tenantId: TENANT, role: "Admin" } as const;

const REQUEST_ID = "tcedit-001";
const TIME_ENTRY_ID = "tentry-001";

// Original (uncorrected) clock window: 09:00–17:00 UTC on a fixed day, epoch ms.
const ORIG_CLOCK_IN = Date.UTC(2026, 5, 1, 9, 0, 0);
const ORIG_CLOCK_OUT = Date.UTC(2026, 5, 1, 17, 0, 0);
// Corrected: clocked in 15 min earlier, out 30 min later.
const FIXED_CLOCK_IN = Date.UTC(2026, 5, 1, 8, 45, 0);
const FIXED_CLOCK_OUT = Date.UTC(2026, 5, 1, 17, 30, 0);

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

/** Build the engine with the Timecard→TimeEntry middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createTimecardEditApprovedTimeEntryApplyMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      // Silence the default console.warn diagnostics in tests.
      onDiagnostic: () => {
        /* no-op */
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

async function seedTimeEntry(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("TimeEntry").create({
    id: TIME_ENTRY_ID,
    tenantId: TENANT,
    employeeId: "emp-42",
    locationId: "",
    shiftId: "",
    clockIn: ORIG_CLOCK_IN,
    clockOut: ORIG_CLOCK_OUT,
    breakMinutes: 30,
    notes: "",
    approvedBy: "",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedRequest(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // `approve` guards status == "pending" and the transition graph only allows
  // approved FROM "pending" — so seed "pending".
  await provider("TimecardEditRequest").create({
    id: REQUEST_ID,
    tenantId: TENANT,
    timeEntryId: TIME_ENTRY_ID,
    employeeId: "emp-42",
    requestedClockIn: FIXED_CLOCK_IN,
    requestedClockOut: FIXED_CLOCK_OUT,
    requestedBreakMinutes: 45,
    reason: "Forgot to clock in on time",
    status: "pending",
    ...overrides,
  } as never);
}

async function approveRequest(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "TimecardEditRequest",
      command: "approve",
      body: { id: REQUEST_ID, tenantId: TENANT, userId: USER.id },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: TimecardEditApproved → TimeEntry.applyEdit", () => {
  it("the compiled IR carries the TimeEntry.applyEdit command (regression-lock the prerequisite)", () => {
    // biome-ignore lint/suspicious/noExplicitAny: structural IR.
    const entities: any[] = ir.entities ?? [];
    const timeEntry = entities.find((e) => e?.name === "TimeEntry");
    expect(timeEntry).toBeDefined();
    const commandNames: string[] = (timeEntry.commands ?? []).map(
      // biome-ignore lint/suspicious/noExplicitAny: command may be string or object.
      (c: any) => (typeof c === "string" ? c : c?.name)
    );
    expect(commandNames).toContain("applyEdit");
  });

  it("approving a timecard edit applies the corrected clock times to the entry", async () => {
    const provider = makeProvider();
    await seedTimeEntry(provider);
    await seedRequest(provider);
    const engine = newEngine(provider);

    const result = await approveRequest(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran TimeEntry.applyEdit against the SAME store, so the
    // entry now carries the corrected window + break.
    const entry = (await provider("TimeEntry").getById(TIME_ENTRY_ID)) as Record<
      string,
      unknown
    >;
    expect(entry.clockIn).toBe(FIXED_CLOCK_IN);
    expect(entry.clockOut).toBe(FIXED_CLOCK_OUT);
    expect(entry.breakMinutes).toBe(45);

    // Secondary proof: the downstream command's own event bubbles up into the parent
    // command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("TimecardEditApproved");
    expect(eventNames).toContain("TimeEntryEdited");
  });

  it("a null requested clock field coalesces to the existing value (never blanks a real time)", async () => {
    const provider = makeProvider();
    await seedTimeEntry(provider);
    // Only the clock-OUT is being corrected; clock-in left unspecified (null).
    await seedRequest(provider, {
      requestedClockIn: null,
      requestedClockOut: FIXED_CLOCK_OUT,
      requestedBreakMinutes: 30,
    });
    const engine = newEngine(provider);

    const result = await approveRequest(engine);
    expect(result.ok).toBe(true);

    const entry = (await provider("TimeEntry").getById(TIME_ENTRY_ID)) as Record<
      string,
      unknown
    >;
    // Clock-in PRESERVED (command coalesced null → self.clockIn); clock-out updated.
    expect(entry.clockIn).toBe(ORIG_CLOCK_IN);
    expect(entry.clockOut).toBe(FIXED_CLOCK_OUT);
  });

  it("does not apply an edit when the linked time entry is deleted (guard-safe)", async () => {
    const provider = makeProvider();
    await seedTimeEntry(provider, { deletedAt: Date.UTC(2026, 5, 2, 0, 0, 0) });
    await seedRequest(provider);
    const engine = newEngine(provider);

    const result = await approveRequest(engine);
    // The approve itself still succeeds; the edit is simply not applied.
    expect(result.ok).toBe(true);

    const entry = (await provider("TimeEntry").getById(TIME_ENTRY_ID)) as Record<
      string,
      unknown
    >;
    // Untouched original window — the middleware skipped the deleted entry.
    expect(entry.clockIn).toBe(ORIG_CLOCK_IN);
    expect(entry.clockOut).toBe(ORIG_CLOCK_OUT);
    expect(entry.breakMinutes).toBe(30);
  });
});
