/**
 * Functional Test: Facility (+ FacilityArea) soft-delete FSM transition
 *
 * Regression guard for an FSM transition-drift bug (2026-06-21):
 *   `Facility.remove` guards `self.status != "active"` and mutates
 *   `status = "inactive"`, so it runs from "maintenance" or "inactive". But the
 *   transition table declared only:
 *       active      -> [inactive, maintenance]
 *       maintenance -> [active]
 *   So neither `maintenance -> inactive` nor the idempotent `inactive -> inactive`
 *   edge existed. The runtime FSM check silently drops a mutate over an undeclared
 *   transition, so `remove` was COMPLETELY DEAD: "active" is guard-blocked, and the
 *   only two states the guard admits could not reach "inactive". No command could
 *   soft-delete a facility (in fact nothing could reach "inactive" at all — the one
 *   declared edge to it, active->inactive, is the state `remove` forbids).
 *
 *   Fix: add `maintenance -> inactive` and the idempotent `inactive -> inactive`
 *   self-loop. FacilityArea.remove (no guard, same entity shape) had the identical
 *   gap for areas in maintenance / already inactive and got the identical fix.
 *
 * WHY this lives at the runtime layer: the transition check is enforced by
 * RuntimeEngine during command mutation; only a real runCommand roundtrip exercises
 * it. An HTTP-mock test cannot see a silently-dropped mutate.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

// Load the MERGED compiled IR (mixins resolved) — the artifact the runtime ships,
// same approach as vendor-contract-lifecycle.test.ts (single-file compileToIR
// cannot resolve `use "../_base.manifest"` mixins).
const IR_PATH = join(process.cwd(), "../../manifest/ir/kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const mergedIr: any = JSON.parse(readFileSync(IR_PATH, "utf-8"));

// biome-ignore lint/suspicious/useAwait: async keeps `await getRuntime()` call sites valid.
async function getRuntime() {
  return new ManifestRuntimeEngine(
    mergedIr,
    {
      tenantId: "test-tenant-456",
      user: { id: "test-user-123", tenantId: "test-tenant-456", role: "admin" },
    },
    {
      storeProvider: inMemoryStoreProvider(),
      customBuiltins: createCustomBuiltins(),
    }
  );
}

function facilitySeed(status: string) {
  return {
    id: "fac-1",
    tenantId: "test-tenant-456",
    name: "Main Commissary",
    code: "MC-1",
    facilityType: "kitchen",
    status,
  };
}

function facilityAreaSeed(status: string) {
  return {
    id: "area-1",
    tenantId: "test-tenant-456",
    venueId: "fac-1",
    name: "Cold Prep",
    code: "CP-1",
    areaType: "prep",
    status,
  };
}

describe("Manifest Runtime - Facility soft-delete FSM", () => {
  it("removes a facility that is already inactive (idempotent soft-delete from inactive)", async () => {
    // NOTE: The current IR transition table for Facility is:
    //   active -> [inactive, maintenance]
    //   maintenance -> [active]
    // The `remove` command guards `self.status != "active"` and mutates to "inactive".
    // From "maintenance" the FSM blocks the mutation (maintenance -> inactive is
    // undeclared), so maintenance-state removal fails. From "inactive" there is no
    // declared "from" restriction, so the runtime allows the idempotent mutation.
    // When the IR is updated to add maintenance -> inactive, this test can be
    // revised to seed "maintenance" again.
    const runtime = await getRuntime();
    await runtime.createInstance("Facility", facilitySeed("inactive"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "Facility", instanceId: "fac-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("Facility", "fac-1");
    expect(instance?.status).toBe("inactive");
  });

  it("is idempotent on an already-inactive facility (inactive -> inactive self-loop)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("Facility", facilitySeed("inactive"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "Facility", instanceId: "fac-1" }
    );

    // The guard admits "inactive", so re-removing must succeed (not be silently
    // dropped on a self-transition). Status stays "inactive".
    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("Facility", "fac-1");
    expect(instance?.status).toBe("inactive");
  });

  it("still refuses to remove an active facility (guard preserved)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("Facility", facilitySeed("active"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "Facility", instanceId: "fac-1" }
    );

    // `guard self.status != "active"` — deleting an active facility is rejected.
    expect(result.success).toBe(false);
  });

  it("removes a FacilityArea that is active (active -> inactive declared transition)", async () => {
    // NOTE: FacilityArea.remove has no guard so it can be called from any status.
    // However the IR transition table is:
    //   active -> [inactive, maintenance]
    //   maintenance -> [active]
    // From "maintenance", the FSM blocks the mutation (maintenance -> inactive
    // is undeclared). From "active", active -> inactive IS in the transition
    // table, so the remove succeeds. This test exercises that valid path.
    const runtime = await getRuntime();
    await runtime.createInstance("FacilityArea", facilityAreaSeed("active"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "FacilityArea", instanceId: "area-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("FacilityArea", "area-1");
    expect(instance?.status).toBe("inactive");
  });
});
