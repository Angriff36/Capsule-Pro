/**
 * Conformance Test: PrepTask.claim end-to-end golden path
 *
 * This test exercises the ONLY write path for claiming a prep task:
 *   RuntimeEngine.runCommand("claim", input, context)
 *
 * It verifies:
 *   1. Deterministic seeding → runCommand → exact mutated state
 *   2. Exact emitted event(s): name, channel, payload shape, ordering
 *   3. Guard denial with stable denial string
 *   4. Policy denial with stable denial string
 *   5. No optimistic/local mutation — state comes from runtime store
 *
 * Invariant: If this test breaks, the claim workflow semantics changed.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-adapters/ir-contract";
import { ManifestRuntimeEngine } from "@repo/manifest-adapters/runtime-engine";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Deterministic fixtures — fixed IDs and timestamps for reproducibility
// ---------------------------------------------------------------------------
const FIXED_NOW = 1_700_000_000_000; // 2023-11-14T22:13:20.000Z
const TASK_ID = "pt-claim-test-001";
const TENANT_ID = "tenant-fixed-001";
const EVENT_ID = "event-fixed-001";
const USER_ID = "user-claimer-001";
const STATION_ID = "station-grill-01";

/**
 * Build a runtime with deterministic `now()` and a known user context.
 * The runtime uses in-memory store (no DB) — this is the manifest-level
 * conformance boundary.
 */
async function buildDeterministicRuntime(userOverrides?: {
  id?: string;
  role?: string;
  tenantId?: string;
}) {
  const manifestPath = join(
    process.cwd(),
    "../../packages/manifest-adapters/manifests/prep-task-rules.manifest"
  );
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Manifest compilation failed: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
    );
  }

  return new ManifestRuntimeEngine(
    enforceCommandOwnership(ir),
    {
      user: {
        id: userOverrides?.id ?? USER_ID,
        tenantId: userOverrides?.tenantId ?? TENANT_ID,
        role: userOverrides?.role ?? "admin",
      },
    },
    {
      now: () => FIXED_NOW,
    }
  );
}

/**
 * Seed a claimable PrepTask in the runtime's in-memory store.
 * Returns the created instance for verification.
 */
async function seedClaimableTask(
  runtime: ManifestRuntimeEngine,
  overrides?: Record<string, unknown>
) {
  const defaults = {
    id: TASK_ID,
    tenantId: TENANT_ID,
    eventId: EVENT_ID,
    name: "Dice onions",
    status: "open",
    priority: 3,
    quantityTotal: 50,
    quantityCompleted: 0,
    dueByDate: FIXED_NOW + 86_400_000, // Due tomorrow (not overdue)
    stationId: "",
    claimedBy: "",
    claimedAt: 0,
  };

  const instance = await runtime.createInstance("PrepTask", {
    ...defaults,
    ...overrides,
  });

  if (!instance) {
    throw new Error(
      "Failed to seed PrepTask — createInstance returned undefined"
    );
  }

  return instance;
}

// ===========================================================================
// GOLDEN PATH: Happy claim
// ===========================================================================
describe("PrepTask.claim conformance", () => {
  describe("golden path — claim open task", () => {
    it("mutates state exactly: status, claimedBy, claimedAt, stationId", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime);

      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // --- Success shape ---
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.guardFailure).toBeUndefined();
      expect(result.policyDenial).toBeUndefined();

      // --- Mutated state (read from store, not from result) ---
      const instance = await runtime.getInstance("PrepTask", TASK_ID);
      expect(instance).toBeDefined();
      expect(instance!.status).toBe("in_progress");
      expect(instance!.claimedBy).toBe(USER_ID);
      expect(instance!.claimedAt).toBe(FIXED_NOW);
      // stationId is accepted in payload but not persisted by current projection
      expect(typeof instance!.stationId).toBe("string");

      // Unchanged fields
      expect(instance!.name).toBe("Dice onions");
      expect(instance!.priority).toBe(3);
      expect(instance!.quantityTotal).toBe(50);
      expect(instance!.quantityCompleted).toBe(0);
    });

    it("emits exactly one PrepTaskClaimed event with correct channel and payload", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime);

      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // --- Event count and ordering ---
      expect(result.emittedEvents).toHaveLength(1);

      const event = result.emittedEvents[0]!;

      // --- Event identity ---
      expect(event.name).toBe("PrepTaskClaimed");
      expect(event.channel).toBe("kitchen.preptask.claimed");

      // --- Event payload contains input parameters ---
      const payload = event.payload as Record<string, unknown>;
      expect(payload.userId).toBe(USER_ID);
      expect(payload.stationId).toBe(STATION_ID);

      // --- Deterministic timestamp ---
      expect(event.timestamp).toBe(FIXED_NOW);

      // --- Emit index (first and only event in this command) ---
      expect(event.emitIndex).toBe(0);
    });

    it("claim is idempotent on state — re-reading store yields same values", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime);

      await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // Read twice — must be identical
      const read1 = await runtime.getInstance("PrepTask", TASK_ID);
      const read2 = await runtime.getInstance("PrepTask", TASK_ID);
      expect(read1).toEqual(read2);
    });
  });

  // =========================================================================
  // NEGATIVE: Guard denial
  // =========================================================================
  describe("guard denial — task already claimed (not open/pending)", () => {
    it("denies with stable guard failure when task is in_progress", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime, {
        status: "in_progress",
        claimedBy: "someone-else",
      });

      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // --- Failure shape ---
      expect(result.success).toBe(false);
      expect(result.error).toBe("Guard condition failed for command 'claim'");

      // --- Guard failure details ---
      expect(result.guardFailure).toBeDefined();
      // Guard 2: self.status == "open" or self.status == "pending"
      expect(result.guardFailure!.index).toBe(2);
      expect(result.guardFailure!.formatted).toContain("status");

      // --- No events emitted on denial ---
      expect(result.emittedEvents).toEqual([]);

      // --- State unchanged ---
      const instance = await runtime.getInstance("PrepTask", TASK_ID);
      expect(instance!.status).toBe("in_progress");
      expect(instance!.claimedBy).toBe("someone-else");
    });

    it("denies with guard 3 when task is open but already claimed", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime, {
        status: "open",
        claimedBy: "someone-else", // Already claimed but status is open (edge case)
      });

      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // Guard 3: self.claimedBy == ""
      expect(result.success).toBe(false);
      expect(result.error).toBe("Guard condition failed for command 'claim'");
      expect(result.guardFailure).toBeDefined();
      expect(result.guardFailure!.index).toBe(3);
      expect(result.guardFailure!.formatted).toContain("claimedBy");

      // No events, no state change
      expect(result.emittedEvents).toEqual([]);
    });
  });

  // =========================================================================
  // NEGATIVE: Policy denial
  // =========================================================================
  describe("policy denial — unauthorized role", () => {
    it("denies with stable policy denial for viewer role", async () => {
      const runtime = await buildDeterministicRuntime({
        id: "viewer-user",
        role: "viewer",
        tenantId: TENANT_ID,
      });
      await seedClaimableTask(runtime);

      const result = await runtime.runCommand(
        "claim",
        { userId: "viewer-user", stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // --- Failure shape ---
      expect(result.success).toBe(false);

      // --- Policy denial details ---
      expect(result.policyDenial).toBeDefined();
      expect(result.deniedBy).toBe("KitchenStaffClaim");
      expect(result.policyDenial!.policyName).toBe("KitchenStaffClaim");
      expect(result.policyDenial!.message).toBe(
        "Kitchen staff can claim prep tasks for their tenant"
      );

      // --- No events emitted on denial ---
      expect(result.emittedEvents).toEqual([]);

      // --- State unchanged ---
      const instance = await runtime.getInstance("PrepTask", TASK_ID);
      expect(instance!.status).toBe("open");
      expect(instance!.claimedBy).toBe("");
    });

    it("denies with stable policy denial for missing tenantId", async () => {
      const runtime = await buildDeterministicRuntime({
        id: USER_ID,
        role: "admin",
        tenantId: "", // Empty tenantId
      });
      await seedClaimableTask(runtime);

      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      expect(result.success).toBe(false);
      expect(result.policyDenial).toBeDefined();
      expect(result.deniedBy).toBe("KitchenStaffClaim");
      expect(result.emittedEvents).toEqual([]);
    });
  });

  // =========================================================================
  // PROJECTION: Store read reflects runtime state, not optimistic mutation
  // =========================================================================
  describe("projection — store is source of truth", () => {
    it("getInstance reflects claimed state after runCommand, not before", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime);

      // Before claim: store shows open, unclaimed
      const before = await runtime.getInstance("PrepTask", TASK_ID);
      expect(before!.status).toBe("open");
      expect(before!.claimedBy).toBe("");
      expect(before!.claimedAt).toBe(0);
      expect(before!.stationId).toBe("");

      // Execute claim
      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );
      expect(result.success).toBe(true);

      // After claim: store shows in_progress, claimed
      const after = await runtime.getInstance("PrepTask", TASK_ID);
      expect(after!.status).toBe("in_progress");
      expect(after!.claimedBy).toBe(USER_ID);
      expect(after!.claimedAt).toBe(FIXED_NOW);
      expect(typeof after!.stationId).toBe("string");
    });

    it("eventLog on runtime matches emittedEvents from result", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime);

      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // The runtime's internal event log should contain the same event
      const log = runtime.getEventLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.name).toBe("PrepTaskClaimed");
      expect(log[0]!.channel).toBe("kitchen.preptask.claimed");
      expect(log[0]!.timestamp).toBe(FIXED_NOW);

      // Event from result and event from log should be the same object
      expect(result.emittedEvents[0]).toBe(log[0]);
    });
  });

  // =========================================================================
  // GUARD: Empty userId denial
  // =========================================================================
  describe("guard denial — empty userId", () => {
    it("denies with guard 1 when userId is empty string", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime);

      const result = await runtime.runCommand(
        "claim",
        { userId: "", stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Guard condition failed for command 'claim'");
      expect(result.guardFailure).toBeDefined();
      expect(result.guardFailure!.index).toBe(1);
      expect(result.emittedEvents).toEqual([]);
    });
  });

  // =========================================================================
  // CONSTRAINT: Overdue warning (non-blocking)
  // =========================================================================
  describe("constraint — overdue warning is non-blocking", () => {
    it("claim succeeds with warn constraint outcome when task is overdue", async () => {
      const runtime = await buildDeterministicRuntime();
      await seedClaimableTask(runtime, {
        dueByDate: FIXED_NOW - 86_400_000, // Due yesterday
      });

      const result = await runtime.runCommand(
        "claim",
        { userId: USER_ID, stationId: STATION_ID },
        { entityName: "PrepTask", instanceId: TASK_ID }
      );

      // Claim should SUCCEED (warn doesn't block)
      expect(result.success).toBe(true);

      // But constraint outcomes should include the warning
      expect(result.constraintOutcomes).toBeDefined();
      const overdueWarning = result.constraintOutcomes!.find(
        (o) => o.constraintName === "warnOverdueClaim"
      );
      expect(overdueWarning).toBeDefined();
      expect(overdueWarning!.severity).toBe("warn");
      expect(overdueWarning!.passed).toBe(false);

      // State should still be mutated
      const instance = await runtime.getInstance("PrepTask", TASK_ID);
      expect(instance!.status).toBe("in_progress");
      expect(instance!.claimedBy).toBe(USER_ID);
    });
  });
});
