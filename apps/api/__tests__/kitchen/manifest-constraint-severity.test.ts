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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@manifest/runtime/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-adapters/ir-contract";
import { ManifestRuntimeEngine } from "@repo/manifest-adapters/runtime-engine";
import { describe, expect, it } from "vitest";

async function getTestRuntime() {
  const manifestPath = join(
    process.cwd(),
    "../../packages/manifest-adapters/manifests/prep-task-rules.manifest"
  );
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile manifest: ${diagnostics.map((d) => d.message).join(", ")}`
    );
  }

  return new ManifestRuntimeEngine(enforceCommandOwnership(ir), {
    userId: "test-user-123",
    tenantId: "test-tenant-456",
  });
}

describe("Manifest Runtime - Constraint Severity Enforcement", () => {
  it("should allow creation when warn constraint fails (warnOverdue)", async () => {
    const runtime = await getTestRuntime();

    // Create data that triggers warnOverdue constraint (overdue task, not done)
    // warnOverdue: self.isOverdue and self.status != "done"
    // isOverdue: self.dueByDate != 0 and now() > self.dueByDate and self.status != "done"
    const overdueTaskData = {
      id: "warn-test-001",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Overdue prep task",
      status: "open",
      taskType: "prep",
      priority: 3, // Valid priority (1-5)
      quantityTotal: 10, // Positive quantity
      dueByDate: Date.now() - 86_400_000, // Due yesterday (overdue)
    };

    // Check constraints to observe the warn outcome
    const outcomes = await runtime.checkConstraints(
      "PrepTask",
      overdueTaskData
    );

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
    const instance = await runtime.createInstance("PrepTask", overdueTaskData);

    // Before the severity fix, this would have returned undefined (blocked)
    // After the fix, it returns a valid instance (not blocked)
    expect(instance).toBeDefined();
    expect(instance?.id).toBe("warn-test-001");
    expect(instance?.status).toBe("open");
    // The critical assertion: instance was created despite warn constraint
    expect(instance?.dueByDate).toBeLessThan(Date.now());
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

