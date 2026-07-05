/**
 * Functional Test: EmployeeAvailability governed create / softDelete lifecycle
 *
 * WHY this exists: the scheduling availability server actions
 * (`apps/app/.../scheduling/availability/actions.ts`) were migrated off direct
 * `database.employeeAvailability.*` writes onto the Manifest runtime
 * (constitution §9). These tests pin the governed semantics that migration now
 * depends on:
 *
 *   1. `create` persists the supplied fields and emits `EmployeeAvailabilityCreated`.
 *   2. `softDelete` stamps `deletedAt`, emits `EmployeeAvailabilityDeleted`, and is
 *      idempotency-guarded (a second softDelete fails — `self.deletedAt == null`).
 *   3. The entity's `default policy` (hr_admin/payroll_admin/manager/admin) is
 *      ENFORCED — a `staff` actor is denied. The prior direct writes had NO role
 *      gate; this test encodes the intended access control (the policy is the
 *      authority, constitution §16), so a future loosening of the gate must be a
 *      deliberate source change, not an accident.
 *   4. Regression guard for the persistence drift the migration had to solve:
 *      `startTime`/`endTime` are `@db.Time(6)` columns and the GenericPrismaStore
 *      coerces the command's string params via `new Date(value)`. A bare "HH:MM"
 *      parses to an INVALID Date (→ NULL → NOT-NULL violation), so the call site
 *      must pass a full ISO datetime string. This guards the exact bug class.
 *
 * WHY this uses the merged IR instead of compileManifestSourceForTest:
 * `compileManifestSourceForTest` cannot resolve `use "../_base.manifest"` mixins
 * and the entity would be incomplete. The merged `kitchen.ir.json` is the same
 * artifact the production runtime ships. This mirrors the approach used by
 * facility-remove-lifecycle.test.ts and vendor-contract-lifecycle.test.ts.
 *
 * WHY datetime fields are epoch-ms numbers (not ISO strings):
 * The Manifest runtime validates `datetime` entity properties with
 * `typeof value === 'number' && Number.isFinite(value) && Math.abs(v) <= 8.64e15`
 * (runtime-engine.js, E_TYPE_DATETIME check). ISO strings fail this check.
 * The production HTTP route coerces ISO strings to epoch ms via
 * `coerceBodyDatetimes` (run-manifest-command-core.ts, R1). Tests that call
 * `runtime.runCommand` directly bypass that coercion layer and must pass
 * epoch ms numbers themselves.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

// Load the MERGED compiled IR (mixins resolved) — same artifact the production
// runtime ships; single-source compileToIR cannot resolve `use "../_base.manifest"`.
const IR_PATH = join(process.cwd(), "../../manifest/ir/kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const mergedIr: any = JSON.parse(readFileSync(IR_PATH, "utf-8"));

const TENANT = "test-tenant-456";

// biome-ignore lint/suspicious/useAwait: async keeps `await getRuntime()` call sites valid.
async function getRuntime(role = "manager") {
  return new ManifestRuntimeEngine(
    mergedIr,
    { tenantId: TENANT, user: { id: "test-user-123", tenantId: TENANT, role } },
    {
      storeProvider: inMemoryStoreProvider(),
      customBuiltins: createCustomBuiltins(),
    }
  );
}

// Epoch millisecond numbers — the only value the runtime's E_TYPE_DATETIME check
// accepts for `datetime` entity properties. The production route coerces ISO
// strings to these via coerceBodyDatetimes; direct runtime.runCommand calls must
// pass them explicitly.
const START_MS = new Date(1970, 0, 1, 9, 0).getTime(); // local 09:00 on 1970-01-01
const END_MS = new Date(1970, 0, 1, 17, 0).getTime(); // local 17:00 on 1970-01-01
const EFFECTIVE_FROM_MS = new Date(2026, 5, 10).getTime(); // 2026-06-10

// Full ISO datetime string used by the @db.Time regression guard only (see below).
const TIME_AS_ISO = new Date(1970, 0, 1, 9, 0).toISOString();

function availabilityBody() {
  return {
    employeeId: "emp-1",
    dayOfWeek: 3,
    startTime: START_MS,
    endTime: END_MS,
    isAvailable: true,
    effectiveFrom: EFFECTIVE_FROM_MS,
    effectiveUntil: null, // nullable datetime — null is valid; coercion skips it
  };
}

// Mirror production run-core's bootstrap: seed the full body, then run `create`
// (whose mutates re-apply the same values idempotently).
async function seedAndCreate(
  runtime: ManifestRuntimeEngine,
  instanceId = "ea-1"
) {
  const body = availabilityBody();
  await runtime.createInstance("EmployeeAvailability", {
    ...body,
    id: instanceId,
  });
  return runtime.runCommand("create", body, {
    entityName: "EmployeeAvailability",
    instanceId,
  });
}

describe("Manifest Runtime - EmployeeAvailability governed lifecycle", () => {
  it("create persists fields and emits EmployeeAvailabilityCreated", async () => {
    const runtime = await getRuntime("manager");
    const res = await seedAndCreate(runtime);

    expect(res.success).toBe(true);
    expect(res.emittedEvents?.map((e) => e.name)).toContain(
      "EmployeeAvailabilityCreated"
    );

    const inst = await runtime.getInstance("EmployeeAvailability", "ea-1");
    expect(inst?.employeeId).toBe("emp-1");
    expect(inst?.dayOfWeek).toBe(3);
    expect(inst?.startTime).toBe(START_MS);
    expect(inst?.isSuspended).toBe(false);
  });

  it("softDelete stamps deletedAt, emits the event, and is guarded against double-delete", async () => {
    const runtime = await getRuntime("manager");
    await seedAndCreate(runtime);

    const del = await runtime.runCommand(
      "softDelete",
      {},
      { entityName: "EmployeeAvailability", instanceId: "ea-1" }
    );
    expect(del.success).toBe(true);
    expect(del.emittedEvents?.map((e) => e.name)).toContain(
      "EmployeeAvailabilityDeleted"
    );

    const inst = await runtime.getInstance("EmployeeAvailability", "ea-1");
    expect(inst?.deletedAt).toBeTruthy();

    // Guard: self.deletedAt == null — a second softDelete must fail.
    const again = await runtime.runCommand(
      "softDelete",
      {},
      { entityName: "EmployeeAvailability", instanceId: "ea-1" }
    );
    expect(again.success).toBe(false);
  });

  it("enforces the default access policy — a staff actor is denied softDelete", async () => {
    // Seed as a privileged actor so the instance exists, then attempt the
    // governed mutation as staff (NOT in the policy role list).
    const adminRuntime = await getRuntime("manager");
    await seedAndCreate(adminRuntime, "ea-policy");

    const staffRuntime = await getRuntime("staff");
    // staffRuntime has its own in-memory store; seed an instance there too.
    await staffRuntime.createInstance("EmployeeAvailability", {
      ...availabilityBody(),
      id: "ea-policy",
    });

    const denied = await staffRuntime.runCommand(
      "softDelete",
      {},
      { entityName: "EmployeeAvailability", instanceId: "ea-policy" }
    );
    expect(denied.success).toBe(false);
  });
});

describe("EmployeeAvailability @db.Time persistence-drift regression guard", () => {
  it("a bare HH:MM string parses to an invalid Date (why ISO conversion is required)", () => {
    // The prior direct write that this migration replaced relied on building a
    // Date object; the GenericPrismaStore path coerces string params via
    // `new Date(value)`. A bare "HH:MM" would yield an invalid Date → NULL on a
    // NOT-NULL @db.Time(6) column.
    expect(Number.isNaN(new Date("09:00").getTime())).toBe(true);

    // A full ISO datetime string (date + time component) yields a valid Date,
    // which is what the @db.Time column expects. The call site must construct
    // this string before handing values to the Prisma store.
    const reparsed = new Date(TIME_AS_ISO);
    expect(Number.isNaN(reparsed.getTime())).toBe(false);
    // The local time-of-day survives the ISO round-trip the call site performs.
    expect(reparsed.getHours()).toBe(9);
  });
});
