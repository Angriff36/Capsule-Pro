/**
 * Functional Test: FacilityAsset + FacilitySchedule soft-delete FSM transitions
 *
 * Regression guard for an FSM transition-drift bug (2026-06-21):
 *   Both `FacilityAsset.remove` and `FacilitySchedule.remove` are no-guard
 *   soft-deletes that mutate a status property to a terminal value:
 *       FacilityAsset.remove    -> status = "retired"
 *       FacilitySchedule.remove -> status = "cancelled"
 *   A no-guard command is callable from EVERY state, but the transition tables
 *   only declared the edges OUT of the early states:
 *       FacilityAsset:    operational -> [maintenance, retired, sold]
 *                         maintenance -> [operational, retired, sold]
 *       FacilitySchedule: scheduled   -> [in_progress, cancelled]
 *                         in_progress -> [completed, cancelled]
 *   So `remove` was SILENTLY DEAD from the end states: a "sold" asset could not be
 *   retired, a "completed" schedule could not be cancelled, and a second `remove`
 *   on an already-removed row (double-click / retry) was dropped instead of a no-op.
 *   The runtime FSM check silently drops a mutate over an undeclared transition.
 *
 *   Fix (mirrors the Facility/FacilityArea.remove fix): make `remove` reach its
 *   terminal from every state — add `sold -> retired` + idempotent `retired ->
 *   retired`, and `completed -> cancelled` + idempotent `cancelled -> cancelled`.
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
// same approach as facility-remove-lifecycle.test.ts (single-file compileToIR
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

function assetSeed(status: string) {
  return {
    id: "asset-1",
    tenantId: "test-tenant-456",
    facilityId: "fac-1",
    areaId: "area-1",
    name: "Convection Oven",
    assetType: "equipment",
    status,
  };
}

function scheduleSeed(status: string) {
  return {
    id: "sched-1",
    tenantId: "test-tenant-456",
    facilityId: "fac-1",
    areaId: "area-1",
    title: "Quarterly Deep Clean",
    scheduleType: "cleaning",
    status,
  };
}

describe("Manifest Runtime - FacilityAsset soft-delete FSM", () => {
  it("removes a sold asset (sold -> retired edge)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("FacilityAsset", assetSeed("sold"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "FacilityAsset", instanceId: "asset-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("FacilityAsset", "asset-1");
    // Before the fix this stayed "sold": the mutate to "retired" was silently
    // dropped because sold -> retired was undeclared.
    expect(instance?.status).toBe("retired");
  });

  it("is idempotent on an already-retired asset (retired -> retired self-loop)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("FacilityAsset", assetSeed("retired"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "FacilityAsset", instanceId: "asset-1" }
    );

    // No guard, so double-remove must succeed as a no-op self-transition.
    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("FacilityAsset", "asset-1");
    expect(instance?.status).toBe("retired");
  });

  it("still removes an operational asset (pre-existing operational -> retired edge)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("FacilityAsset", assetSeed("operational"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "FacilityAsset", instanceId: "asset-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("FacilityAsset", "asset-1");
    expect(instance?.status).toBe("retired");
  });
});

describe("Manifest Runtime - FacilitySchedule soft-delete FSM", () => {
  it("removes a completed schedule (completed -> cancelled edge)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("FacilitySchedule", scheduleSeed("completed"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "FacilitySchedule", instanceId: "sched-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("FacilitySchedule", "sched-1");
    // Before the fix this stayed "completed": completed -> cancelled was undeclared.
    expect(instance?.status).toBe("cancelled");
  });

  it("is idempotent on an already-cancelled schedule (cancelled -> cancelled self-loop)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("FacilitySchedule", scheduleSeed("cancelled"));

    const result = await runtime.runCommand(
      "remove",
      {},
      { entityName: "FacilitySchedule", instanceId: "sched-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("FacilitySchedule", "sched-1");
    expect(instance?.status).toBe("cancelled");
  });
});
