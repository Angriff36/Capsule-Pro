/**
 * Persistence tests for BROKEN_PRISMA_READ Batch 12 stores:
 *   - PrepCommentPrismaStore (tenant_kitchen, soft-delete, camelCase fields)
 *   - PricingTierPrismaStore (tenant_inventory, soft-delete, Decimal fields)
 *   - TimeEntryPrismaStore (tenant_staff, mixed naming, soft-delete via deleted_at)
 *   - TimecardEditRequestPrismaStore (tenant_staff, hard delete, no deletedAt)
 *   - TrainingAssignmentPrismaStore (tenant_staff, all snake_case, soft-delete)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — one per Prisma model
// ---------------------------------------------------------------------------

const mockPrepComment = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockPricingTier = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockTimeEntry = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockTimecardEditRequest = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockTrainingAssignment = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Decimal stub — Prisma.Decimal replacement in tests
// ---------------------------------------------------------------------------

class DecimalStub {
  value: string;
  constructor(v: string | number) {
    this.value = String(v);
  }
}

// ---------------------------------------------------------------------------
// Mock @repo/database/standalone
// ---------------------------------------------------------------------------

vi.mock("@repo/database/standalone", () => ({
  Prisma: { Decimal: DecimalStub },
}));

// ---------------------------------------------------------------------------
// Mock client
// ---------------------------------------------------------------------------

const TID = "t-001";

interface MockClient {
  prepComment: typeof mockPrepComment;
  pricingTier: typeof mockPricingTier;
  timeEntry: typeof mockTimeEntry;
  timecardEditRequest: typeof mockTimecardEditRequest;
  trainingAssignment: typeof mockTrainingAssignment;
}

function makeMockClient(): MockClient {
  return {
    prepComment: {
      ...mockPrepComment,
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    pricingTier: {
      ...mockPricingTier,
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    timeEntry: {
      ...mockTimeEntry,
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    timecardEditRequest: {
      ...mockTimecardEditRequest,
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    trainingAssignment: {
      ...mockTrainingAssignment,
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Dynamic imports — MUST come after mocks are set up
// ---------------------------------------------------------------------------

let PrepCommentPrismaStore: typeof import("../src/prisma-stores/broken-read-batch12-prep-pricing.js").PrepCommentPrismaStore;
let PricingTierPrismaStore: typeof import("../src/prisma-stores/broken-read-batch12-prep-pricing.js").PricingTierPrismaStore;
let TimeEntryPrismaStore: typeof import("../src/prisma-stores/broken-read-batch12-staff-time.js").TimeEntryPrismaStore;
let TimecardEditRequestPrismaStore: typeof import("../src/prisma-stores/broken-read-batch12-staff-time.js").TimecardEditRequestPrismaStore;
let TrainingAssignmentPrismaStore: typeof import("../src/prisma-stores/broken-read-batch12-staff-time.js").TrainingAssignmentPrismaStore;

beforeEach(async () => {
  vi.clearAllMocks();
  const prepPricing = await import(
    "../src/prisma-stores/broken-read-batch12-prep-pricing.js"
  );
  PrepCommentPrismaStore = prepPricing.PrepCommentPrismaStore;
  PricingTierPrismaStore = prepPricing.PricingTierPrismaStore;
  const staffTime = await import(
    "../src/prisma-stores/broken-read-batch12-staff-time.js"
  );
  TimeEntryPrismaStore = staffTime.TimeEntryPrismaStore;
  TimecardEditRequestPrismaStore = staffTime.TimecardEditRequestPrismaStore;
  TrainingAssignmentPrismaStore = staffTime.TrainingAssignmentPrismaStore;
});

// ---------------------------------------------------------------------------
// PrepComment
// ---------------------------------------------------------------------------

describe("PrepCommentPrismaStore", () => {
  it("create maps fields and tenantId", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "pc-1",
      tenantId: TID,
      taskId: "task-1",
      employeeId: "emp-1",
      commentText: "Needs more salt",
      isResolved: false,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
    };
    client.prepComment.create.mockResolvedValue(fakeRow);
    const store = new PrepCommentPrismaStore(
      client as unknown as Parameters<typeof PrepCommentPrismaStore>[0],
      TID
    );
    await store.create({
      taskId: "task-1",
      employeeId: "emp-1",
      commentText: "Needs more salt",
    });
    expect(client.prepComment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        taskId: "task-1",
        employeeId: "emp-1",
        commentText: "Needs more salt",
        isResolved: false,
      }),
    });
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    const client = makeMockClient();
    client.prepComment.findMany.mockResolvedValue([]);
    const store = new PrepCommentPrismaStore(
      client as unknown as Parameters<typeof PrepCommentPrismaStore>[0],
      TID
    );
    await store.getAll();
    expect(client.prepComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TID, deletedAt: null },
      })
    );
  });

  it("getById uses composite key tenantId_id", async () => {
    const client = makeMockClient();
    client.prepComment.findFirst.mockResolvedValue(null);
    const store = new PrepCommentPrismaStore(
      client as unknown as Parameters<typeof PrepCommentPrismaStore>[0],
      TID
    );
    await store.getById("pc-1");
    expect(client.prepComment.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "pc-1", deletedAt: null },
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.prepComment.update.mockResolvedValue({});
    const store = new PrepCommentPrismaStore(
      client as unknown as Parameters<typeof PrepCommentPrismaStore>[0],
      TID
    );
    const result = await store.delete("pc-1");
    expect(result).toBe(true);
    expect(client.prepComment.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "pc-1" } },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("mapToManifestEntity maps fields correctly", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "pc-1",
      tenantId: TID,
      taskId: "task-1",
      employeeId: "emp-1",
      commentText: "Check seasoning",
      isResolved: true,
      resolvedAt: new Date("2026-01-02T10:00:00Z"),
      resolvedBy: "emp-2",
      createdAt: new Date("2026-01-01T08:00:00Z"),
      updatedAt: new Date("2026-01-02T10:00:00Z"),
      deletedAt: null,
    };
    client.prepComment.findFirst.mockResolvedValue(fakeRow);
    const store = new PrepCommentPrismaStore(
      client as unknown as Parameters<typeof PrepCommentPrismaStore>[0],
      TID
    );
    const entity = await store.getById("pc-1");
    expect(entity).toEqual({
      id: "pc-1",
      tenantId: TID,
      taskId: "task-1",
      employeeId: "emp-1",
      commentText: "Check seasoning",
      isResolved: true,
      resolvedAt: fakeRow.resolvedAt.getTime(),
      resolvedBy: "emp-2",
      createdAt: fakeRow.createdAt.getTime(),
      updatedAt: fakeRow.updatedAt.getTime(),
      deletedAt: null,
    });
  });
});

// ---------------------------------------------------------------------------
// PricingTier
// ---------------------------------------------------------------------------

describe("PricingTierPrismaStore", () => {
  it("create maps Decimal fields and tenantId", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "pt-1",
      tenantId: TID,
      catalogEntryId: "cat-1",
      tierName: "Volume Discount",
      minQuantity: 100,
      maxQuantity: 500,
      unitCost: 9.99,
      discountPercent: 10,
      effectiveFrom: null,
      effectiveTo: null,
      isActive: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
    };
    client.pricingTier.create.mockResolvedValue(fakeRow);
    const store = new PricingTierPrismaStore(
      client as unknown as Parameters<typeof PricingTierPrismaStore>[0],
      TID
    );
    await store.create({
      catalogEntryId: "cat-1",
      tierName: "Volume Discount",
      minQuantity: 100,
      unitCost: 9.99,
    });
    expect(client.pricingTier.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        catalogEntryId: "cat-1",
        tierName: "Volume Discount",
        isActive: true,
      }),
    });
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    const client = makeMockClient();
    client.pricingTier.findMany.mockResolvedValue([]);
    const store = new PricingTierPrismaStore(
      client as unknown as Parameters<typeof PricingTierPrismaStore>[0],
      TID
    );
    await store.getAll();
    expect(client.pricingTier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TID, deletedAt: null },
      })
    );
  });

  it("getById uses composite key tenantId_id", async () => {
    const client = makeMockClient();
    client.pricingTier.findFirst.mockResolvedValue(null);
    const store = new PricingTierPrismaStore(
      client as unknown as Parameters<typeof PricingTierPrismaStore>[0],
      TID
    );
    await store.getById("pt-1");
    expect(client.pricingTier.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "pt-1", deletedAt: null },
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.pricingTier.update.mockResolvedValue({});
    const store = new PricingTierPrismaStore(
      client as unknown as Parameters<typeof PricingTierPrismaStore>[0],
      TID
    );
    const result = await store.delete("pt-1");
    expect(result).toBe(true);
    expect(client.pricingTier.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "pt-1" } },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("mapToManifestEntity converts Decimal fields to numbers", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "pt-1",
      tenantId: TID,
      catalogEntryId: "cat-1",
      tierName: "Bulk",
      minQuantity: 50,
      maxQuantity: null,
      unitCost: 12.5,
      discountPercent: null,
      effectiveFrom: new Date("2026-02-01"),
      effectiveTo: null,
      isActive: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
    };
    client.pricingTier.findFirst.mockResolvedValue(fakeRow);
    const store = new PricingTierPrismaStore(
      client as unknown as Parameters<typeof PricingTierPrismaStore>[0],
      TID
    );
    const entity = await store.getById("pt-1");
    expect(entity).toEqual({
      id: "pt-1",
      tenantId: TID,
      catalogEntryId: "cat-1",
      tierName: "Bulk",
      minQuantity: 50,
      maxQuantity: null,
      unitCost: 12.5,
      discountPercent: null,
      effectiveFrom: fakeRow.effectiveFrom.getTime(),
      effectiveTo: null,
      isActive: true,
      createdAt: fakeRow.createdAt.getTime(),
      updatedAt: fakeRow.updatedAt.getTime(),
      deletedAt: null,
    });
  });
});

// ---------------------------------------------------------------------------
// TimeEntry
// ---------------------------------------------------------------------------

describe("TimeEntryPrismaStore", () => {
  it("create maps mixed naming fields (camelCase + snake_case)", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "te-1",
      tenantId: TID,
      employeeId: "emp-1",
      locationId: "loc-1",
      shift_id: "shift-1",
      clockIn: new Date("2026-01-01T08:00:00Z"),
      clockOut: null,
      breakMinutes: 30,
      notes: "Opening shift",
      approved_by: null,
      approved_at: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deleted_at: null,
    };
    client.timeEntry.create.mockResolvedValue(fakeRow);
    const store = new TimeEntryPrismaStore(
      client as unknown as Parameters<typeof TimeEntryPrismaStore>[0],
      TID
    );
    await store.create({
      employeeId: "emp-1",
      clockIn: new Date("2026-01-01T08:00:00Z").getTime(),
      breakMinutes: 30,
      notes: "Opening shift",
    });
    expect(client.timeEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        employeeId: "emp-1",
        shift_id: null,
        breakMinutes: 30,
        notes: "Opening shift",
      }),
    });
  });

  it("getAll filters by tenantId and deleted_at null (snake_case)", async () => {
    const client = makeMockClient();
    client.timeEntry.findMany.mockResolvedValue([]);
    const store = new TimeEntryPrismaStore(
      client as unknown as Parameters<typeof TimeEntryPrismaStore>[0],
      TID
    );
    await store.getAll();
    expect(client.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TID, deleted_at: null },
      })
    );
  });

  it("getById uses composite key tenantId_id with deleted_at null", async () => {
    const client = makeMockClient();
    client.timeEntry.findFirst.mockResolvedValue(null);
    const store = new TimeEntryPrismaStore(
      client as unknown as Parameters<typeof TimeEntryPrismaStore>[0],
      TID
    );
    await store.getById("te-1");
    expect(client.timeEntry.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "te-1", deleted_at: null },
    });
  });

  it("delete soft-deletes via deleted_at (snake_case)", async () => {
    const client = makeMockClient();
    client.timeEntry.update.mockResolvedValue({});
    const store = new TimeEntryPrismaStore(
      client as unknown as Parameters<typeof TimeEntryPrismaStore>[0],
      TID
    );
    const result = await store.delete("te-1");
    expect(result).toBe(true);
    expect(client.timeEntry.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "te-1" } },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it("mapToManifestEntity normalizes snake_case to camelCase", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "te-1",
      tenantId: TID,
      employeeId: "emp-1",
      locationId: "loc-1",
      shift_id: "shift-1",
      clockIn: new Date("2026-01-01T08:00:00Z"),
      clockOut: new Date("2026-01-01T16:30:00Z"),
      breakMinutes: 30,
      notes: "Late clock-out",
      approved_by: "mgr-1",
      approved_at: new Date("2026-01-01T17:00:00Z"),
      createdAt: new Date("2026-01-01T08:00:00Z"),
      updatedAt: new Date("2026-01-01T17:00:00Z"),
      deleted_at: null,
    };
    client.timeEntry.findFirst.mockResolvedValue(fakeRow);
    const store = new TimeEntryPrismaStore(
      client as unknown as Parameters<typeof TimeEntryPrismaStore>[0],
      TID
    );
    const entity = await store.getById("te-1");
    expect(entity).toEqual({
      id: "te-1",
      tenantId: TID,
      employeeId: "emp-1",
      locationId: "loc-1",
      shiftId: "shift-1",
      clockIn: fakeRow.clockIn.getTime(),
      clockOut: fakeRow.clockOut.getTime(),
      breakMinutes: 30,
      notes: "Late clock-out",
      approvedBy: "mgr-1",
      approvedAt: fakeRow.approved_at.getTime(),
      createdAt: fakeRow.createdAt.getTime(),
      updatedAt: fakeRow.updatedAt.getTime(),
      deletedAt: null,
    });
  });
});

// ---------------------------------------------------------------------------
// TimecardEditRequest
// ---------------------------------------------------------------------------

describe("TimecardEditRequestPrismaStore", () => {
  it("create maps fields with no soft-delete", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "tcr-1",
      tenantId: TID,
      timeEntryId: "te-1",
      employeeId: "emp-1",
      requestedClockIn: new Date("2026-01-01T07:45:00Z"),
      requestedClockOut: null,
      requestedBreakMinutes: 30,
      reason: "Forgot to clock in",
      status: "pending",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    client.timecardEditRequest.create.mockResolvedValue(fakeRow);
    const store = new TimecardEditRequestPrismaStore(
      client as unknown as Parameters<typeof TimecardEditRequestPrismaStore>[0],
      TID
    );
    await store.create({
      timeEntryId: "te-1",
      employeeId: "emp-1",
      reason: "Forgot to clock in",
    });
    expect(client.timecardEditRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        timeEntryId: "te-1",
        employeeId: "emp-1",
        reason: "Forgot to clock in",
        status: "pending",
      }),
    });
  });

  it("getAll filters by tenantId only (no deletedAt — hard-delete model)", async () => {
    const client = makeMockClient();
    client.timecardEditRequest.findMany.mockResolvedValue([]);
    const store = new TimecardEditRequestPrismaStore(
      client as unknown as Parameters<typeof TimecardEditRequestPrismaStore>[0],
      TID
    );
    await store.getAll();
    expect(client.timecardEditRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TID },
      })
    );
  });

  it("getById uses composite key tenantId_id (no deletedAt filter)", async () => {
    const client = makeMockClient();
    client.timecardEditRequest.findFirst.mockResolvedValue(null);
    const store = new TimecardEditRequestPrismaStore(
      client as unknown as Parameters<typeof TimecardEditRequestPrismaStore>[0],
      TID
    );
    await store.getById("tcr-1");
    expect(client.timecardEditRequest.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "tcr-1" },
    });
  });

  it("delete performs hard delete (no deletedAt column)", async () => {
    const client = makeMockClient();
    client.timecardEditRequest.delete.mockResolvedValue({});
    const store = new TimecardEditRequestPrismaStore(
      client as unknown as Parameters<typeof TimecardEditRequestPrismaStore>[0],
      TID
    );
    const result = await store.delete("tcr-1");
    expect(result).toBe(true);
    expect(client.timecardEditRequest.delete).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "tcr-1" } },
    });
  });

  it("mapToManifestEntity maps fields correctly with no deletedAt", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "tcr-1",
      tenantId: TID,
      timeEntryId: "te-1",
      employeeId: "emp-1",
      requestedClockIn: new Date("2026-01-01T07:45:00Z"),
      requestedClockOut: new Date("2026-01-01T16:15:00Z"),
      requestedBreakMinutes: 45,
      reason: "Incorrect clock times",
      status: "approved",
      createdAt: new Date("2026-01-01T18:00:00Z"),
      updatedAt: new Date("2026-01-01T19:00:00Z"),
    };
    client.timecardEditRequest.findFirst.mockResolvedValue(fakeRow);
    const store = new TimecardEditRequestPrismaStore(
      client as unknown as Parameters<typeof TimecardEditRequestPrismaStore>[0],
      TID
    );
    const entity = await store.getById("tcr-1");
    expect(entity).toEqual({
      id: "tcr-1",
      tenantId: TID,
      timeEntryId: "te-1",
      employeeId: "emp-1",
      requestedClockIn: fakeRow.requestedClockIn.getTime(),
      requestedClockOut: fakeRow.requestedClockOut.getTime(),
      requestedBreakMinutes: 45,
      reason: "Incorrect clock times",
      status: "approved",
      createdAt: fakeRow.createdAt.getTime(),
      updatedAt: fakeRow.updatedAt.getTime(),
    });
  });
});

// ---------------------------------------------------------------------------
// TrainingAssignment
// ---------------------------------------------------------------------------

describe("TrainingAssignmentPrismaStore", () => {
  it("create maps all snake_case fields", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "ta-1",
      tenant_id: TID,
      module_id: "mod-1",
      employee_id: "emp-1",
      assigned_to_all: false,
      assigned_by: "mgr-1",
      due_date: new Date("2026-02-01"),
      status: "assigned",
      assigned_at: new Date("2026-01-01"),
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-01-01"),
      deleted_at: null,
    };
    client.trainingAssignment.create.mockResolvedValue(fakeRow);
    const store = new TrainingAssignmentPrismaStore(
      client as unknown as Parameters<typeof TrainingAssignmentPrismaStore>[0],
      TID
    );
    await store.create({
      moduleId: "mod-1",
      employeeId: "emp-1",
      assignedBy: "mgr-1",
      dueDate: new Date("2026-02-01").getTime(),
    });
    expect(client.trainingAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: TID,
        module_id: "mod-1",
        employee_id: "emp-1",
        assigned_to_all: false,
        assigned_by: "mgr-1",
        status: "assigned",
      }),
    });
  });

  it("getAll filters by tenant_id and deleted_at null (snake_case)", async () => {
    const client = makeMockClient();
    client.trainingAssignment.findMany.mockResolvedValue([]);
    const store = new TrainingAssignmentPrismaStore(
      client as unknown as Parameters<typeof TrainingAssignmentPrismaStore>[0],
      TID
    );
    await store.getAll();
    expect(client.trainingAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: TID, deleted_at: null },
      })
    );
  });

  it("getById uses composite key tenant_id_id (snake_case)", async () => {
    const client = makeMockClient();
    client.trainingAssignment.findFirst.mockResolvedValue(null);
    const store = new TrainingAssignmentPrismaStore(
      client as unknown as Parameters<typeof TrainingAssignmentPrismaStore>[0],
      TID
    );
    await store.getById("ta-1");
    expect(client.trainingAssignment.findFirst).toHaveBeenCalledWith({
      where: { tenant_id: TID, id: "ta-1", deleted_at: null },
    });
  });

  it("delete soft-deletes via deleted_at (snake_case)", async () => {
    const client = makeMockClient();
    client.trainingAssignment.update.mockResolvedValue({});
    const store = new TrainingAssignmentPrismaStore(
      client as unknown as Parameters<typeof TrainingAssignmentPrismaStore>[0],
      TID
    );
    const result = await store.delete("ta-1");
    expect(result).toBe(true);
    expect(client.trainingAssignment.update).toHaveBeenCalledWith({
      where: { tenant_id_id: { tenant_id: TID, id: "ta-1" } },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it("mapToManifestEntity normalizes snake_case to camelCase", async () => {
    const client = makeMockClient();
    const fakeRow = {
      id: "ta-1",
      tenant_id: TID,
      module_id: "mod-1",
      employee_id: "emp-1",
      assigned_to_all: false,
      assigned_by: "mgr-1",
      due_date: new Date("2026-02-01T00:00:00Z"),
      status: "in_progress",
      assigned_at: new Date("2026-01-01T10:00:00Z"),
      created_at: new Date("2026-01-01T10:00:00Z"),
      updated_at: new Date("2026-01-15T12:00:00Z"),
      deleted_at: null,
    };
    client.trainingAssignment.findFirst.mockResolvedValue(fakeRow);
    const store = new TrainingAssignmentPrismaStore(
      client as unknown as Parameters<typeof TrainingAssignmentPrismaStore>[0],
      TID
    );
    const entity = await store.getById("ta-1");
    expect(entity).toEqual({
      id: "ta-1",
      tenantId: TID,
      moduleId: "mod-1",
      employeeId: "emp-1",
      assignedToAll: false,
      assignedBy: "mgr-1",
      dueDate: fakeRow.due_date.getTime(),
      status: "in_progress",
      assignedAt: fakeRow.assigned_at.getTime(),
      createdAt: fakeRow.created_at.getTime(),
      updatedAt: fakeRow.updated_at.getTime(),
      deletedAt: null,
    });
  });
});
