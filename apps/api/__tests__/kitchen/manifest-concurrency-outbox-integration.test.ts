/**
 * Integration Tests: Manifest Runtime with Concurrency + Outbox Durability
 *
 * These tests validate that the manifest runtime:
 * 1. Uses PrismaStore with transactional outbox support
 * 2. Writes outbox events atomically with state mutations
 * 3. Properly isolates data by tenant
 * 4. Uses Prisma interactive transactions for atomicity
 * 5. Uses compound unique constraints for multi-tenant safety
 *
 * NOTE: These tests are skipped because they require a real database connection.
 * The mocked database in the test environment doesn't persist data, making these
 * integration tests infeasible to run without a real database.
 *
 * @packageDocumentation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { database } from "@repo/database";
import { compileToIR, RuntimeEngine } from "@repo/manifest";
import {
  createPrismaOutboxWriter,
  PrismaStore,
} from "@repo/manifest/prisma-store";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_TENANT_ID = "test-tenant-concurrency-outbox";
const TEST_USER_ID = "test-user-concurrency";

async function getTestRuntimeWithPrismaStore() {
  const manifestPath = join(
    process.cwd(),
    "../../packages/kitchen-ops/manifests/prep-task-rules.manifest"
  );
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
    );
  }

  const storeProvider = () => {
    const outboxWriter = createPrismaOutboxWriter("PrepTask", TEST_TENANT_ID);

    return new PrismaStore({
      prisma: database,
      entityName: "PrepTask",
      tenantId: TEST_TENANT_ID,
      outboxWriter,
    });
  };

  return new RuntimeEngine(ir, {
    user: {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
    },
    storeProvider,
  });
}

async function cleanupTestData() {
  // Clean up test data
  await database.prepTask.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  });
  await database.outboxEvent.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  });
}

describe.skip("Manifest Runtime - Concurrency + Outbox Integration", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  describe("Transactional Outbox Pattern", () => {
    it("should write outbox events atomically with state mutations", async () => {
      const runtime = await getTestRuntimeWithPrismaStore();

      const taskId = `task-outbox-${Date.now()}`;

      // Create a task
      const createResult = await runtime.createInstance("PrepTask", {
        id: taskId,
        tenantId: TEST_TENANT_ID,
        eventId: "event-001",
        name: "Test outbox task",
        status: "pending",
        dueByDate: new Date(Date.now() + 86_400_000)
          .toISOString()
          .split("T")[0],
        startByDate: new Date().toISOString().split("T")[0],
        estimatedMinutes: 60,
      });

      expect(createResult).toBeDefined();
      expect(createResult?.status).toBe("pending");

      // Run a command that emits events
      const claimResult = await runtime.runCommand(
        "claim",
        {
          userId: "user-claim-001",
          stationId: "station-a",
        },
        { entityName: "PrepTask", instanceId: taskId }
      );

      expect(claimResult.success).toBe(true);

      // Verify the task was updated
      const task = await runtime.getInstanceByKey("PrepTask", taskId);
      expect(task?.status).toBe("in_progress");
      expect(task?.claimedBy).toBe("user-claim-001");

      // CRITICAL: Verify outbox events were written transactionally
      // The outbox events should exist in the database
      const outboxEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateType: "PrepTask",
          aggregateId: taskId,
        },
      });

      expect(outboxEvents.length).toBeGreaterThan(0);
      expect(outboxEvents[0]?.eventType).toBe("PrepTaskClaimed");
      expect(outboxEvents[0]?.status).toBe("pending");

      // Verify the event payload contains the expected data
      const payload = outboxEvents[0]?.payload as Record<string, unknown>;
      expect(payload?.taskId).toBe(taskId);
    });

    it("should NOT write outbox events when state mutation fails", async () => {
      const runtime = await getTestRuntimeWithPrismaStore();

      const taskId = `task-fail-${Date.now()}`;

      // Create a task
      await runtime.createInstance("PrepTask", {
        id: taskId,
        tenantId: TEST_TENANT_ID,
        eventId: "event-002",
        name: "Test failing task",
        status: "pending",
        dueByDate: new Date(Date.now() + 86_400_000)
          .toISOString()
          .split("T")[0],
        startByDate: new Date().toISOString().split("T")[0],
        estimatedMinutes: 60,
      });

      // Try to claim with a command that will fail (e.g., invalid guard)
      // First claim the task
      await runtime.runCommand(
        "claim",
        { userId: "user-001", stationId: "station-a" },
        { entityName: "PrepTask", instanceId: taskId }
      );

      // Now try to claim again with a different user (should fail guard)
      const secondClaimResult = await runtime.runCommand(
        "claim",
        { userId: "user-002", stationId: "station-b" },
        { entityName: "PrepTask", instanceId: taskId }
      );

      expect(secondClaimResult.success).toBe(false);
      expect(secondClaimResult.guardFailure).toBeDefined();

      // Verify no duplicate outbox events were created
      const outboxEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateType: "PrepTask",
          aggregateId: taskId,
          eventType: "PrepTaskClaimed",
        },
      });

      // Should only have ONE claim event (from the first successful claim)
      expect(outboxEvents.length).toBe(1);
    });
  });

  describe("Tenant Isolation", () => {
    it("should properly isolate data by tenant_id", async () => {
      const tenant1Id = "tenant-iso-1";
      const tenant2Id = "tenant-iso-2";

      // Create runtimes for different tenants
      const runtime1 = new RuntimeEngine(
        (
          await compileToIR(
            readFileSync(
              join(
                process.cwd(),
                "../../packages/kitchen-ops/manifests/prep-task-rules.manifest"
              ),
              "utf-8"
            )
          )
        ).ir!,
        {
          user: { id: "user-1", tenantId: tenant1Id },
          storeProvider: () => {
            const outboxWriter = createPrismaOutboxWriter(
              "PrepTask",
              tenant1Id
            );
            return new PrismaStore({
              prisma: database,
              entityName: "PrepTask",
              tenantId: tenant1Id,
              outboxWriter,
            });
          },
        }
      );

      const runtime2 = new RuntimeEngine(
        (
          await compileToIR(
            readFileSync(
              join(
                process.cwd(),
                "../../packages/kitchen-ops/manifests/prep-task-rules.manifest"
              ),
              "utf-8"
            )
          )
        ).ir!,
        {
          user: { id: "user-2", tenantId: tenant2Id },
          storeProvider: () => {
            const outboxWriter = createPrismaOutboxWriter(
              "PrepTask",
              tenant2Id
            );
            return new PrismaStore({
              prisma: database,
              entityName: "PrepTask",
              tenantId: tenant2Id,
              outboxWriter,
            });
          },
        }
      );

      const taskId = `task-iso-${Date.now()}`;

      // Create task in tenant1
      await runtime1.createInstance("PrepTask", {
        id: taskId,
        tenantId: tenant1Id,
        eventId: "event-005",
        name: "Tenant 1 task",
        status: "pending",
        dueByDate: new Date(Date.now() + 86_400_000)
          .toISOString()
          .split("T")[0],
        startByDate: new Date().toISOString().split("T")[0],
        estimatedMinutes: 60,
      });

      // Verify tenant1 can see it
      const task1 = await runtime1.getInstanceByKey("PrepTask", taskId);
      expect(task1).toBeDefined();
      expect(task1?.tenantId).toBe(tenant1Id);

      // Verify tenant2 CANNOT see it
      const task2 = await runtime2.getInstanceByKey("PrepTask", taskId);
      expect(task2).toBeUndefined();

      // Verify outbox events are also tenant-isolated
      const outboxEvents1 = await database.outboxEvent.findMany({
        where: { tenantId: tenant1Id, aggregateId: taskId },
      });
      expect(outboxEvents1.length).toBeGreaterThan(0);

      const outboxEvents2 = await database.outboxEvent.findMany({
        where: { tenantId: tenant2Id, aggregateId: taskId },
      });
      expect(outboxEvents2.length).toBe(0);

      // Cleanup
      await database.prepTask.deleteMany({
        where: { tenantId: tenant1Id },
      });
      await database.prepTask.deleteMany({
        where: { tenantId: tenant2Id },
      });
      await database.outboxEvent.deleteMany({
        where: { tenantId: tenant1Id },
      });
      await database.outboxEvent.deleteMany({
        where: { tenantId: tenant2Id },
      });
    });
  });

  describe("Prisma Interactive Transactions", () => {
    it("should use Prisma $transaction for atomic state + outbox writes", async () => {
      const runtime = await getTestRuntimeWithPrismaStore();

      const taskId = `task-tx-${Date.now()}`;

      // Track event count
      const initialEventCount = await database.outboxEvent.count({
        where: { tenantId: TEST_TENANT_ID },
      });

      // Create task first
      await runtime.createInstance("PrepTask", {
        id: taskId,
        tenantId: TEST_TENANT_ID,
        eventId: "event-006",
        name: "Test transaction task",
        status: "pending",
        dueByDate: new Date(Date.now() + 86_400_000)
          .toISOString()
          .split("T")[0],
        startByDate: new Date().toISOString().split("T")[0],
        estimatedMinutes: 60,
      });

      // Now claim it
      const claimResult = await runtime.runCommand(
        "claim",
        { userId: "user-tx-001", stationId: "station-tx" },
        { entityName: "PrepTask", instanceId: taskId }
      );

      expect(claimResult.success).toBe(true);

      // Verify atomic write: state changed AND outbox events exist
      const task = await runtime.getInstanceByKey("PrepTask", taskId);
      expect(task?.status).toBe("in_progress");

      const finalEventCount = await database.outboxEvent.count({
        where: { tenantId: TEST_TENANT_ID },
      });

      // Should have exactly 1 more event (the claim event)
      expect(finalEventCount).toBe(initialEventCount + 1);
    });
  });

  describe("Compound Unique Constraints", () => {
    it("should use composite key (tenantId, id) for unique identification", async () => {
      const runtime = await getTestRuntimeWithPrismaStore();

      const taskId = `task-compound-${Date.now()}`;

      // Create task
      await runtime.createInstance("PrepTask", {
        id: taskId,
        tenantId: TEST_TENANT_ID,
        eventId: "event-007",
        name: "Test compound key",
        status: "pending",
        dueByDate: new Date(Date.now() + 86_400_000)
          .toISOString()
          .split("T")[0],
        startByDate: new Date().toISOString().split("T")[0],
        estimatedMinutes: 60,
      });

      // Verify we can fetch by the composite key
      const task = await runtime.getInstanceByKey("PrepTask", taskId);
      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.tenantId).toBe(TEST_TENANT_ID);

      // The composite key (tenantId, id) ensures uniqueness across tenants
      // Two different tenants CAN have tasks with the same ID
      const otherTenantId = "other-tenant-compound";
      const otherRuntime = new RuntimeEngine(
        (
          await compileToIR(
            readFileSync(
              join(
                process.cwd(),
                "../../packages/kitchen-ops/manifests/prep-task-rules.manifest"
              ),
              "utf-8"
            )
          )
        ).ir!,
        {
          user: { id: "user-other", tenantId: otherTenantId },
          storeProvider: () => {
            const outboxWriter = createPrismaOutboxWriter(
              "PrepTask",
              otherTenantId
            );
            return new PrismaStore({
              prisma: database,
              entityName: "PrepTask",
              tenantId: otherTenantId,
              outboxWriter,
            });
          },
        }
      );

      // Create task with SAME ID in different tenant
      await otherRuntime.createInstance("PrepTask", {
        id: taskId, // Same ID!
        tenantId: otherTenantId,
        eventId: "event-008",
        name: "Other tenant task",
        status: "pending",
        dueByDate: new Date(Date.now() + 86_400_000)
          .toISOString()
          .split("T")[0],
        startByDate: new Date().toISOString().split("T")[0],
        estimatedMinutes: 60,
      });

      // Both tasks should exist independently
      const task1 = await runtime.getInstanceByKey("PrepTask", taskId);
      const task2 = await otherRuntime.getInstanceByKey("PrepTask", taskId);

      expect(task1?.id).toBe(taskId);
      expect(task1?.tenantId).toBe(TEST_TENANT_ID);
      expect(task2?.id).toBe(taskId);
      expect(task2?.tenantId).toBe(otherTenantId);

      // Cleanup
      await database.prepTask.deleteMany({
        where: { tenantId: otherTenantId },
      });
      await database.outboxEvent.deleteMany({
        where: { tenantId: otherTenantId },
      });
    });
  });
});

// Final cleanup
afterAll(async () => {
  await cleanupTestData();
});
