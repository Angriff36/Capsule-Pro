/**
 * Functional Test: Manifest Runtime Execution for PrepTask Commands
 *
 * Tests that the Manifest runtime correctly:
 * 1. Executes valid commands and mutates state
 * 2. Enforces guards (prevents invalid state transitions)
 * 3. Returns proper success/failure responses
 * 4. Emits events on successful commands
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR, RuntimeEngine } from "@repo/manifest";
import { describe, expect, it } from "vitest";

async function getTestRuntime() {
  const manifestPath = join(
    process.cwd(),
    "../../packages/kitchen-ops/manifests/prep-task-rules.manifest"
  );
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile manifest: ${diagnostics.map((d) => d.message).join(", ")}`
    );
  }

  return new RuntimeEngine(ir, {
    user: {
      id: "test-user-123",
      tenantId: "test-tenant-456",
      role: "admin",
    },
  });
}

describe("Manifest Runtime - PrepTask Commands", () => {
  it("should successfully claim an open task", async () => {
    const runtime = await getTestRuntime();

    // Create a test PrepTask with future due date to avoid warn constraints
    const createResult = await runtime.createInstance("PrepTask", {
      id: "task-001",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Prep vegetables",
      status: "open",
      dueByDate: Date.now() + 86_400_000, // Due tomorrow
    });

    expect(createResult).toBeDefined();
    expect(createResult?.status).toBe("open");

    // Claim the task
    const claimResult = await runtime.runCommand(
      "claim",
      {
        userId: "user-001",
        stationId: "station-a",
      },
      { entityName: "PrepTask", instanceId: "task-001" }
    );

    // Verify success
    expect(claimResult.success).toBe(true);
    expect(claimResult.error).toBeUndefined();
    expect(claimResult.guardFailure).toBeUndefined();
    expect(claimResult.policyDenial).toBeUndefined();

    // Verify state mutation
    const instance = await runtime.getInstanceByKey("PrepTask", "task-001");
    expect(instance?.status).toBe("in_progress");
    expect(instance?.claimedBy).toBe("user-001");
    expect(instance?.stationId).toBe("station-a");
    expect(instance?.claimedAt).toBeGreaterThan(0);

    // Verify event emission
    expect(claimResult.emittedEvents).toHaveLength(1);
    expect(claimResult.emittedEvents?.[0]?.name).toBe("PrepTaskClaimed");
  });

  it("should enforce guards - prevent claiming non-open task", async () => {
    const runtime = await getTestRuntime();

    // Create a task that's already in progress
    await runtime.createInstance("PrepTask", {
      id: "task-002",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Prep salad",
      status: "in_progress",
      claimedBy: "existing-user",
      dueByDate: Date.now() + 86_400_000, // Due tomorrow
    });

    // Try to claim it (should fail guard check)
    const claimResult = await runtime.runCommand(
      "claim",
      {
        userId: "new-user",
        stationId: "station-b",
      },
      { entityName: "PrepTask", instanceId: "task-002" }
    );

    // Verify failure
    expect(claimResult.success).toBe(false);
    expect(claimResult.guardFailure).toBeDefined();
    expect(claimResult.guardFailure?.index).toBe(2); // Second guard fails
    expect(claimResult.guardFailure?.formatted).toContain("status");

    // Verify state was NOT mutated
    const instance = await runtime.getInstanceByKey("PrepTask", "task-002");
    expect(instance?.status).toBe("in_progress"); // Unchanged
    expect(instance?.claimedBy).toBe("existing-user"); // Unchanged

    // Verify no events emitted
    expect(claimResult.emittedEvents).toEqual([]);
  });

  it("should enforce guards - prevent completing with wrong user", async () => {
    const runtime = await getTestRuntime();

    // Create and claim a task
    await runtime.createInstance("PrepTask", {
      id: "task-003",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Prep dessert",
      status: "in_progress",
      claimedBy: "user-001",
      quantityTotal: 10,
      dueByDate: Date.now() + 86_400_000,
    });

    // Try to complete with different user (should fail guard)
    const completeResult = await runtime.runCommand(
      "complete",
      {
        quantityCompleted: 10,
        userId: "different-user",
      },
      { entityName: "PrepTask", instanceId: "task-003" }
    );

    // Verify failure
    expect(completeResult.success).toBe(false);
    expect(completeResult.guardFailure).toBeDefined();
    expect(completeResult.guardFailure?.index).toBe(3); // Third guard fails

    // Verify state unchanged
    const instance = await runtime.getInstanceByKey("PrepTask", "task-003");
    expect(instance?.status).toBe("in_progress"); // Still in progress
    expect(instance?.quantityCompleted).toBe(0); // Not updated
  });

  it("should successfully complete task with correct user", async () => {
    const runtime = await getTestRuntime();

    // Create and claim a task
    await runtime.createInstance("PrepTask", {
      id: "task-004",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Prep soup",
      status: "in_progress",
      claimedBy: "user-001",
      quantityTotal: 20,
      dueByDate: Date.now() + 86_400_000,
    });

    // Complete with correct user
    const completeResult = await runtime.runCommand(
      "complete",
      {
        quantityCompleted: 20,
        userId: "user-001",
      },
      { entityName: "PrepTask", instanceId: "task-004" }
    );

    // Verify success
    expect(completeResult.success).toBe(true);

    // Verify state mutation
    const instance = await runtime.getInstanceByKey("PrepTask", "task-004");
    expect(instance?.status).toBe("done");
    expect(instance?.quantityCompleted).toBe(20);

    // Verify event emission
    expect(completeResult.emittedEvents).toHaveLength(1);
    expect(completeResult.emittedEvents?.[0]?.name).toBe("PrepTaskCompleted");
  });

  it("should handle release command correctly", async () => {
    const runtime = await getTestRuntime();

    // Create claimed task
    await runtime.createInstance("PrepTask", {
      id: "task-005",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Prep appetizers",
      status: "in_progress",
      claimedBy: "user-001",
      stationId: "station-c",
      dueByDate: Date.now() + 86_400_000,
    });

    // Release the task
    const releaseResult = await runtime.runCommand(
      "release",
      {
        userId: "user-001",
        reason: "Emergency - need to switch tasks",
      },
      { entityName: "PrepTask", instanceId: "task-005" }
    );

    // Verify success
    expect(releaseResult.success).toBe(true);

    // Verify state reset
    const instance = await runtime.getInstanceByKey("PrepTask", "task-005");
    expect(instance?.status).toBe("open");
    expect(instance?.claimedBy).toBe("");
    expect(instance?.claimedAt).toBe(0);
    expect(instance?.stationId).toBe("");

    // Verify event emission
    expect(releaseResult.emittedEvents).toHaveLength(1);
    expect(releaseResult.emittedEvents?.[0]?.name).toBe("PrepTaskReleased");
  });

  it("should compute properties correctly", async () => {
    const runtime = await getTestRuntime();

    // Create a task with high priority and claimed
    const instance = await runtime.createInstance("PrepTask", {
      id: "task-006",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Critical prep",
      status: "open",
      priority: 2,
      claimedBy: "user-001",
      quantityTotal: 100,
      quantityCompleted: 25,
      dueByDate: Date.now() + 86_400_000,
    });

    // Verify computed properties
    expect(instance?.isClaimed).toBe(true); // claimedBy != ""
    expect(instance?.isUrgent).toBe(true); // priority <= 2
    expect(instance?.isHighPriority).toBe(true); // priority <= 3
    expect(instance?.isCompleted).toBe(false); // status != "done"
    expect(instance?.percentComplete).toBe(25); // (25/100) * 100
  });

  it("should validate constraints - prevent invalid status", async () => {
    const runtime = await getTestRuntime();

    // Try to create task with invalid status (should fail constraint validation)
    const createResult = await runtime.createInstance("PrepTask", {
      id: "task-007",
      tenantId: "test-tenant-456",
      eventId: "event-001",
      name: "Invalid task",
      status: "invalid-status",
      dueByDate: Date.now() + 86_400_000,
    });

    // Constraint validation should fail, returning undefined
    expect(createResult).toBeUndefined();
  });
});
