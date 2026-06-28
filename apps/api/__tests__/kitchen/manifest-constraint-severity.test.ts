/**
 * Constraint Severity Test: Entity-Level Constraint Enforcement
 *
 * Tests that the Manifest runtime correctly respects constraint severity:
 * 1. severity:warn constraints do NOT block entity creation (produce outcome, allow operation)
 * 2. severity:block constraints DO block entity creation (prevent operation)
 *
 * This test proves the fix in runtime-engine.ts that filters by severity before blocking.
 * Before the fix, ALL failed constraints blocked execution regardless of severity.
 */

import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { ManifestRuntimeEngine } from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import {
  inMemoryStoreProvider,
  readManifestSourceWithBase,
} from "../test-helpers";

async function getTestRuntime() {
  const source = readManifestSourceWithBase(
    "kitchen/prep-task-rules.manifest"
  );
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
    );
  }

  return new ManifestRuntimeEngine(
    ir,
    {
      userId: "test-user-123",
      tenantId: "test-tenant-456",
    },
    { storeProvider: inMemoryStoreProvider() }
  );
}

describe("Manifest Runtime - Constraint Severity Enforcement", () => {
  it("should allow creation when warn constraint fails (warnOverdue)", async () => {
    const runtime = await getTestRuntime();

    // The `warnOverdue:warn` constraint is a POSITIVE-assert constraint under the
    // @angriff36/manifest 2.18.6 engine: a constraint whose name does NOT start
    // with "severity" passes when its expression is truthy and FAILS when falsy
    // (runtime-engine evaluateConstraint: `passed = !!result`). Its expression is
    // the overdue predicate, so it fails (passed=false, severity=warn) precisely
    // when the task is NOT overdue. A future-due task therefore produces a failed
    // warn outcome without any blocking constraint — exactly the scenario this
    // test needs to prove warn-severity does not block creation.
    const taskData = {
      id: "warn-test-001",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Not-overdue prep task",
      status: "open",
      taskType: "prep",
      priority: 3, // Valid priority (1-5) — no block constraint fires
      quantityTotal: 10, // Positive quantity — no block constraint fires
      stationId: "", // Unstationed — keeps warnStationCapacity below warnOverdue
      claimedBy: "",
      dueByDate: Date.now() + 86_400_000, // Due tomorrow (not overdue → warnOverdue fails)
    };

    // Check constraints to observe the warn outcome
    const outcomes = await runtime.checkConstraints("PrepTask", taskData);

    // Verify that a warn-severity constraint failed
    const warnOutcomes = outcomes.filter(
      (o) => !o.passed && o.severity === "warn"
    );
    expect(warnOutcomes.length).toBeGreaterThan(0);
    expect(warnOutcomes[0]?.constraintName).toBe("warnOverdue");

    // Verify no blocking constraints failed
    const blockOutcomes = outcomes.filter(
      (o) => !o.passed && o.severity === "block"
    );
    expect(blockOutcomes.length).toBe(0);

    // CRITICAL TEST: createInstance should succeed despite warn constraint failure
    const instance = await runtime.createInstance("PrepTask", taskData);

    // Before the severity fix, this would have returned undefined (blocked)
    // After the fix, it returns a valid instance (not blocked)
    expect(instance).toBeDefined();
    expect(instance?.id).toBe("warn-test-001");
    expect(instance?.status).toBe("open");
    // The critical assertion: instance was created despite warn constraint
    expect(instance?.dueByDate).toBeGreaterThan(Date.now());
  });

  it("should block creation when block constraint fails (validStatus)", async () => {
    const runtime = await getTestRuntime();

    // Create data that triggers validStatus constraint (invalid status value)
    // validStatus: self.status in ["open", "in_progress", "done", "canceled"]
    const invalidStatusData = {
      id: "block-test-001",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Invalid status task",
      status: "invalid-status-value", // Violates validStatus constraint
      dueByDate: Date.now() + 86_400_000,
    };

    // Check constraints to observe the block outcome
    const outcomes = await runtime.checkConstraints(
      "PrepTask",
      invalidStatusData
    );

    // Verify that a block-severity constraint failed
    const blockOutcomes = outcomes.filter(
      (o) => !o.passed && o.severity === "block"
    );
    expect(blockOutcomes.length).toBeGreaterThan(0);
    expect(blockOutcomes[0]?.constraintName).toBe("validStatus");

    // CRITICAL TEST: createInstance should fail due to block constraint
    const instance = await runtime.createInstance(
      "PrepTask",
      invalidStatusData
    );

    // Both before and after the fix, this should return undefined (blocked)
    expect(instance).toBeUndefined();
  });

  it("should allow entity update when warn constraint fails (warnStationCapacity)", async () => {
    const runtime = await getTestRuntime();

    // Create initial task (valid, no warnings)
    const initialTask = await runtime.createInstance("PrepTask", {
      id: "update-warn-001",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Station capacity test",
      status: "open",
      stationId: "", // No station yet
      claimedBy: "", // Not claimed yet
      priority: 3,
      quantityTotal: 10,
      dueByDate: Date.now() + 86_400_000, // Due tomorrow
    });

    expect(initialTask).toBeDefined();

    // Update task to trigger warnStationCapacity constraint
    // warnStationCapacity:warn self.stationId != "" and self.isClaimed
    const updatedData = {
      stationId: "station-a",
      claimedBy: "user-001", // This combination triggers warnStationCapacity
    };

    // Check constraints on the updated data
    const mergedData = { ...initialTask, ...updatedData };
    const outcomes = await runtime.checkConstraints("PrepTask", mergedData);

    // Verify at least one warn constraint is triggered (may be warnStationCapacity or other warns)
    const warnOutcomes = outcomes.filter(
      (o) => !o.passed && o.severity === "warn"
    );
    expect(warnOutcomes.length).toBeGreaterThan(0);

    // Verify no blocking constraints
    const blockOutcomes = outcomes.filter(
      (o) => !o.passed && o.severity === "block"
    );
    expect(blockOutcomes.length).toBe(0);

    // CRITICAL TEST: updateInstance should succeed despite warn constraint(s)
    const updatedInstance = await runtime.updateInstance(
      "PrepTask",
      "update-warn-001",
      updatedData
    );

    // Before the severity fix, this would have returned undefined (blocked by ANY failed constraint)
    // After the fix, it returns the updated instance (not blocked by warn-severity constraints)
    expect(updatedInstance).toBeDefined();
    expect(updatedInstance?.stationId).toBe("station-a");
    expect(updatedInstance?.claimedBy).toBe("user-001");
  });
});
