/**
 * Unit tests for PrepTaskPlanWorkflowPrismaStore
 *
 * Why this test suite exists: the 16 lifecycle command routes for
 * PrepTaskPlanWorkflow rely on this Prisma-backed store to keep writes
 * (commands) and reads (UI list/detail routes) talking to the same table.
 * Before this store existed, mutations went to `manifest_entities` (JSON
 * blob) while reads queried the dedicated `prep_task_plan_workflows`
 * table — so workflows were effectively invisible to the UI.
 *
 * Coverage:
 * - CRUD round-trip (create, read, update, soft delete, clear)
 * - Tenant isolation enforced on every query
 * - Manifest property names mapped 1:1 to Prisma model fields
 * - Timestamp number ↔ Date conversions (incl. zero/null handling)
 * - JSON-shape string defaults survive create/update without mutation
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrepTaskPlanWorkflowPrismaStore } from "../src/prisma-store";

// Hoisted mock for the Prisma model accessor — must be defined this way so
// vi.mock factories below can reference it without temporal-dead-zone errors.
const mockPrepTaskPlanWorkflow = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  Prisma: {},
}));

interface MockPrismaClient {
  prepTaskPlanWorkflow: typeof mockPrepTaskPlanWorkflow;
}

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const WORKFLOW_ID = "ffffffff-ffff-4fff-ffff-ffffffffffff";
const EVENT_ID = "33333333-3333-4333-3333-333333333333";
const NOW = new Date("2026-04-27T12:00:00.000Z");

/** Build a fully-populated Prisma row matching the new schema. */
function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT_A,
    id: WORKFLOW_ID,
    eventId: EVENT_ID,
    idempotencyKey: "idem-1",
    status: "created",
    currentStep: 0,
    totalSteps: 5,
    generationOptions: "{}",
    generatedTasks: "[]",
    reviewedTasks: "[]",
    approvedTaskIds: "[]",
    rejectedTaskIds: "[]",
    instantiatedTaskIds: "[]",
    scheduledWindows: "{}",
    constraintOutcomes: "[]",
    errors: "[]",
    warnings: "[]",
    generatedCount: 0,
    approvedCount: 0,
    instantiatedCount: 0,
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    approvedAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

describe("PrepTaskPlanWorkflowPrismaStore", () => {
  let store: PrepTaskPlanWorkflowPrismaStore;
  let prisma: MockPrismaClient;

  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) so queued mockResolvedValueOnce
    // results don't leak between test cases.
    vi.resetAllMocks();
    prisma = { prepTaskPlanWorkflow: mockPrepTaskPlanWorkflow };
    store = new PrepTaskPlanWorkflowPrismaStore(
      prisma as unknown as Parameters<typeof PrepTaskPlanWorkflowPrismaStore>[0],
      TENANT_A
    );
  });

  describe("getAll", () => {
    it("filters by tenant and excludes soft-deleted rows", async () => {
      mockPrepTaskPlanWorkflow.findMany.mockResolvedValueOnce([buildRow()]);

      const result = await store.getAll();

      expect(mockPrepTaskPlanWorkflow.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_A, deletedAt: null },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(WORKFLOW_ID);
      expect(result[0].tenantId).toBe(TENANT_A);
    });

    it("never queries another tenant's rows", async () => {
      mockPrepTaskPlanWorkflow.findMany.mockResolvedValueOnce([]);
      const otherStore = new PrepTaskPlanWorkflowPrismaStore(
        prisma as unknown as Parameters<typeof PrepTaskPlanWorkflowPrismaStore>[0],
        TENANT_B
      );

      await otherStore.getAll();

      expect(mockPrepTaskPlanWorkflow.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_B, deletedAt: null },
      });
    });
  });

  describe("getById", () => {
    it("returns the manifest entity when the row exists", async () => {
      mockPrepTaskPlanWorkflow.findFirst.mockResolvedValueOnce(
        buildRow({ status: "awaiting_review", generatedCount: 7 })
      );

      const result = await store.getById(WORKFLOW_ID);

      expect(mockPrepTaskPlanWorkflow.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_A, id: WORKFLOW_ID, deletedAt: null },
      });
      expect(result?.status).toBe("awaiting_review");
      expect(result?.generatedCount).toBe(7);
    });

    it("returns undefined when the row is missing", async () => {
      mockPrepTaskPlanWorkflow.findFirst.mockResolvedValueOnce(null);
      const result = await store.getById(WORKFLOW_ID);
      expect(result).toBeUndefined();
    });
  });

  describe("create", () => {
    it("persists every manifest property with sensible defaults", async () => {
      mockPrepTaskPlanWorkflow.create.mockImplementationOnce(
        async ({ data }: { data: Record<string, unknown> }) => buildRow(data)
      );

      const result = await store.create({
        id: WORKFLOW_ID,
        eventId: EVENT_ID,
        idempotencyKey: "idem-create",
      });

      const call = mockPrepTaskPlanWorkflow.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      // Tenant scoping is mandatory.
      expect(call.data.tenantId).toBe(TENANT_A);
      expect(call.data.id).toBe(WORKFLOW_ID);
      // Defaults from the manifest spec.
      expect(call.data.status).toBe("created");
      expect(call.data.currentStep).toBe(0);
      expect(call.data.totalSteps).toBe(5);
      expect(call.data.generationOptions).toBe("{}");
      expect(call.data.generatedTasks).toBe("[]");
      expect(call.data.scheduledWindows).toBe("{}");
      expect(call.data.errors).toBe("[]");
      // Empty optional reviewer/approver should serialize as null in DB.
      expect(call.data.reviewedBy).toBeNull();
      expect(call.data.approvedBy).toBeNull();
      // Result echoes the manifest contract.
      expect(result.id).toBe(WORKFLOW_ID);
      expect(result.tenantId).toBe(TENANT_A);
    });

    it("converts millis timestamps to Date and ignores 0", async () => {
      mockPrepTaskPlanWorkflow.create.mockImplementationOnce(
        async ({ data }: { data: Record<string, unknown> }) => buildRow(data)
      );

      const startedAtMillis = Date.UTC(2026, 3, 27, 12, 0, 0);
      await store.create({
        id: WORKFLOW_ID,
        eventId: EVENT_ID,
        idempotencyKey: "idem-times",
        startedAt: startedAtMillis,
        completedAt: 0, // manifest sentinel for "not set"
      });

      const call = mockPrepTaskPlanWorkflow.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(call.data.startedAt).toBeInstanceOf(Date);
      expect((call.data.startedAt as Date).getTime()).toBe(startedAtMillis);
      // 0 should not produce a Date(0) — that would mean 1970-01-01.
      expect(call.data.completedAt).toBeNull();
    });

    it("auto-generates an id when not supplied", async () => {
      mockPrepTaskPlanWorkflow.create.mockImplementationOnce(
        async ({ data }: { data: Record<string, unknown> }) => buildRow(data)
      );

      const result = await store.create({
        eventId: EVENT_ID,
        idempotencyKey: "idem-noid",
      });

      const call = mockPrepTaskPlanWorkflow.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(typeof call.data.id).toBe("string");
      expect((call.data.id as string).length).toBeGreaterThan(0);
      expect(result.id).toBe(call.data.id);
    });
  });

  describe("update", () => {
    it("only writes fields the caller supplied (no clobbering)", async () => {
      mockPrepTaskPlanWorkflow.update.mockImplementationOnce(
        async ({ data }: { data: Record<string, unknown> }) =>
          buildRow({ status: "generating", currentStep: 1, ...data })
      );

      await store.update(WORKFLOW_ID, {
        status: "generating",
        currentStep: 1,
      });

      const call = mockPrepTaskPlanWorkflow.update.mock.calls[0][0] as {
        where: unknown;
        data: Record<string, unknown>;
      };
      expect(call.where).toEqual({
        tenantId_id: { tenantId: TENANT_A, id: WORKFLOW_ID },
      });
      // Caller-supplied fields propagated.
      expect(call.data.status).toBe("generating");
      expect(call.data.currentStep).toBe(1);
      // updatedAt is always set.
      expect(call.data.updatedAt).toBeInstanceOf(Date);
      // Fields the caller didn't supply must not appear in the update payload.
      expect(call.data).not.toHaveProperty("eventId");
      expect(call.data).not.toHaveProperty("generatedTasks");
      expect(call.data).not.toHaveProperty("totalSteps");
    });

    it("converts reviewedAt/approvedAt millis to Date", async () => {
      mockPrepTaskPlanWorkflow.update.mockImplementationOnce(
        async ({ data }: { data: Record<string, unknown> }) =>
          buildRow({ ...data })
      );

      const reviewedAtMillis = Date.UTC(2026, 3, 28, 9, 30, 0);
      await store.update(WORKFLOW_ID, { reviewedAt: reviewedAtMillis });

      const call = mockPrepTaskPlanWorkflow.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(call.data.reviewedAt).toBeInstanceOf(Date);
      expect((call.data.reviewedAt as Date).getTime()).toBe(reviewedAtMillis);
    });

    it("treats empty reviewedBy/approvedBy as null in DB", async () => {
      mockPrepTaskPlanWorkflow.update.mockImplementationOnce(
        async ({ data }: { data: Record<string, unknown> }) =>
          buildRow({ ...data })
      );

      await store.update(WORKFLOW_ID, { reviewedBy: "", approvedBy: "" });

      const call = mockPrepTaskPlanWorkflow.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(call.data.reviewedBy).toBeNull();
      expect(call.data.approvedBy).toBeNull();
    });

    it("returns undefined and reports the error when the row is missing", async () => {
      mockPrepTaskPlanWorkflow.update.mockRejectedValueOnce(
        new Error("Record to update not found")
      );

      const result = await store.update(WORKFLOW_ID, { status: "failed" });
      expect(result).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("performs a soft delete by setting deletedAt", async () => {
      mockPrepTaskPlanWorkflow.update.mockResolvedValueOnce(
        buildRow({ deletedAt: NOW })
      );

      const ok = await store.delete(WORKFLOW_ID);

      expect(ok).toBe(true);
      const call = mockPrepTaskPlanWorkflow.update.mock.calls[0][0] as {
        where: unknown;
        data: Record<string, unknown>;
      };
      expect(call.where).toEqual({
        tenantId_id: { tenantId: TENANT_A, id: WORKFLOW_ID },
      });
      expect(call.data.deletedAt).toBeInstanceOf(Date);
    });

    it("returns false on Prisma errors instead of throwing", async () => {
      mockPrepTaskPlanWorkflow.update.mockRejectedValueOnce(
        new Error("Record not found")
      );

      const ok = await store.delete(WORKFLOW_ID);
      expect(ok).toBe(false);
    });
  });

  describe("clear", () => {
    it("soft-deletes every active row for this tenant only", async () => {
      mockPrepTaskPlanWorkflow.updateMany.mockResolvedValueOnce({ count: 3 });

      await store.clear();

      const call = mockPrepTaskPlanWorkflow.updateMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      expect(call.where).toEqual({ tenantId: TENANT_A, deletedAt: null });
      expect(call.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe("mapToManifestEntity (via getById)", () => {
    it("converts Date columns to epoch millis numbers", async () => {
      const startedAt = new Date("2026-04-27T08:00:00.000Z");
      const completedAt = new Date("2026-04-27T11:30:00.000Z");
      mockPrepTaskPlanWorkflow.findFirst.mockResolvedValueOnce(
        buildRow({
          startedAt,
          completedAt,
          reviewedAt: null,
          status: "completed",
        })
      );

      const result = await store.getById(WORKFLOW_ID);
      expect(result?.startedAt).toBe(startedAt.getTime());
      expect(result?.completedAt).toBe(completedAt.getTime());
      // null DB columns become 0 in the manifest contract.
      expect(result?.reviewedAt).toBe(0);
    });

    it("returns isDeleted=false and deletedAt=0 for live rows", async () => {
      // getById filters soft-deleted rows out at the SQL layer, so the
      // mapper-level isDeleted flag should always be false for any row that
      // reaches the application. Verify the mapping contract.
      mockPrepTaskPlanWorkflow.findFirst.mockResolvedValueOnce(buildRow());
      const live = await store.getById(WORKFLOW_ID);
      expect(live?.isDeleted).toBe(false);
      expect(live?.deletedAt).toBe(0);
    });

    it("preserves JSON-shape string defaults verbatim", async () => {
      const payload = '[{"id":"task-1","name":"Mise"}]';
      mockPrepTaskPlanWorkflow.findFirst.mockResolvedValueOnce(
        buildRow({ generatedTasks: payload, generatedCount: 1 })
      );

      const result = await store.getById(WORKFLOW_ID);
      expect(result?.generatedTasks).toBe(payload);
      expect(result?.generatedCount).toBe(1);
    });
  });
});
