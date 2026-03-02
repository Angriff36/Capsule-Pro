/**
 * Integration test: dry-run vs commit outbox semantics.
 *
 * Proves the strongest claim: "commit writes outbox rows with correlationId;
 * dry-run never does." Uses real DB and outbox.find by correlationId.
 *
 * Run with: pnpm vitest --config vitest.config.integration.mts manifest-dry-run-outbox
 *
 * @packageDocumentation
 */

import { database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000002";

async function cleanupTestData() {
  await database.prepTask.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  });
  await database.outboxEvent.deleteMany({
    where: { tenantId: TEST_TENANT_ID },
  });
}

describe("Manifest dry-run vs commit outbox semantics", () => {
  let taskId: string;

  beforeAll(async () => {
    await cleanupTestData();
    // Create a PrepTask to claim
    const prepTask = await database.prepTask.create({
      data: {
        tenantId: TEST_TENANT_ID,
        id: `task-dryrun-${Date.now()}`,
        eventId: "event-dryrun-001",
        name: "Dry-run test task",
        taskType: "prep",
        status: "pending",
        priority: 5,
        quantityTotal: 1,
        quantityCompleted: 0,
        startByDate: new Date(),
        dueByDate: new Date(Date.now() + 86_400_000),
        locationId: "loc-001",
      },
    });
    taskId = prepTask.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("dry-run: no outbox rows for correlationId", async () => {
    const correlationId = `dry-run-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const runtime = await createManifestRuntime({
      user: {
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      },
      entityName: "PrepTask",
      deterministicMode: true,
    });

    const result = await runtime.runCommand(
      "claim",
      { userId: "user-claim-001", stationId: "station-a" },
      { entityName: "PrepTask", instanceId: taskId, correlationId }
    );

    expect(result.success).toBe(true);

    const outboxRows = await database.outboxEvent.findMany({
      where: { tenantId: TEST_TENANT_ID, correlationId },
    });

    expect(outboxRows).toHaveLength(0);
  });

  it("commit: outbox rows exist for correlationId", async () => {
    const correlationId = `commit-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const runtime = await createManifestRuntime({
      user: {
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      },
      entityName: "PrepTask",
      deterministicMode: false,
    });

    const result = await runtime.runCommand(
      "claim",
      { userId: "user-claim-002", stationId: "station-b" },
      { entityName: "PrepTask", instanceId: taskId, correlationId }
    );

    expect(result.success).toBe(true);

    const outboxRows = await database.outboxEvent.findMany({
      where: { tenantId: TEST_TENANT_ID, correlationId },
    });

    expect(outboxRows.length).toBeGreaterThanOrEqual(1);
    expect(outboxRows[0]?.eventType).toBe("PrepTaskClaimed");
    expect(outboxRows[0]?.status).toBe("pending");
  });
});
