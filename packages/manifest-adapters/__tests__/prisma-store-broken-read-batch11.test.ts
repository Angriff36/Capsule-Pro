/**
 * Persistence tests for BROKEN_PRISMA_READ Batch 11
 *
 * Entities: MenuDish, OverrideAudit, PayrollApprovalHistory,
 *           PayrollPeriod, PayrollRun
 *
 * MenuDish has an existing inline store in prisma-store.ts — these tests
 * verify wiring. OverrideAudit and the payroll stores are new batch11 stores.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted mocks — one per Prisma model accessor
// ---------------------------------------------------------------------------

const mockMenuDish = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockOverrideAudit = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockApprovalHistory = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockPayrollPeriods = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockPayrollRuns = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

// Minimal Decimal stub so inline stores that use `new Prisma.Decimal()` still work
class DecimalStub {
  value: number;
  constructor(v: number) {
    this.value = v;
  }
  [Symbol.toPrimitive]() {
    return this.value;
  }
}

vi.mock("@repo/database/standalone", () => ({
  Prisma: { Decimal: DecimalStub },
}));

// ---------------------------------------------------------------------------
// Mock client + store construction
// ---------------------------------------------------------------------------

interface MockClient {
  menuDish: typeof mockMenuDish;
  overrideAudit: typeof mockOverrideAudit;
  approvalHistory: typeof mockApprovalHistory;
  payroll_periods: typeof mockPayrollPeriods;
  payroll_runs: typeof mockPayrollRuns;
}

const prisma: MockClient = {
  menuDish: mockMenuDish,
  overrideAudit: mockOverrideAudit,
  approvalHistory: mockApprovalHistory,
  payroll_periods: mockPayrollPeriods,
  payroll_runs: mockPayrollRuns,
};

// Import stores AFTER mocks are set up
const { MenuDishPrismaStore } = await import("../src/prisma-store.js");
const { OverrideAuditPrismaStore } = await import(
  "../src/prisma-stores/broken-read-batch11-override-audit.js"
);
const {
  PayrollApprovalHistoryPrismaStore,
  PayrollPeriodPrismaStore,
  PayrollRunPrismaStore,
} = await import("../src/prisma-stores/broken-read-batch11-payroll.js");

const TENANT = "55555555-5555-5555-5555-555555555555";
const OTHER_TENANT = "66666666-6666-6666-6666-666666666666";

beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// MenuDishPrismaStore (existing inline store — verify wiring)
// ===========================================================================

describe("MenuDishPrismaStore", () => {
  const store = new MenuDishPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT,
  );

  it("create maps fields and tenantId", async () => {
    mockMenuDish.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    );

    await store.create({
      id: "md-1",
      menuId: "menu-1",
      dishId: "dish-1",
      course: "appetizer",
      sortOrder: 1,
      isOptional: false,
    });

    const call = mockMenuDish.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.menuId).toBe("menu-1");
    expect(call.data.dishId).toBe("dish-1");
    expect(call.data.course).toBe("appetizer");
    expect(call.data.sortOrder).toBe(1);
    expect(call.data.isOptional).toBe(false);
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockMenuDish.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockMenuDish.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("getById uses composite key tenantId_id", async () => {
    mockMenuDish.findFirst.mockResolvedValueOnce(null);
    await store.getById("md-1");
    const call = mockMenuDish.findFirst.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("md-1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with composite key", async () => {
    mockMenuDish.update.mockResolvedValueOnce({});
    const result = await store.delete("md-1");
    expect(result).toBe(true);
    const call = mockMenuDish.update.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.where.tenantId_id.id).toBe("md-1");
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity maps fields correctly", async () => {
    mockMenuDish.findFirst.mockResolvedValueOnce({
      id: "md-2",
      tenantId: TENANT,
      menuId: "menu-2",
      dishId: "dish-2",
      course: "main",
      sortOrder: 3,
      isOptional: true,
      createdAt: new Date("2026-01-15"),
      updatedAt: new Date("2026-01-16"),
      deletedAt: null,
    });

    const entity = await store.getById("md-2");
    expect(entity?.id).toBe("md-2");
    expect(entity?.tenantId).toBe(TENANT);
    expect(entity?.menuId).toBe("menu-2");
    expect(entity?.dishId).toBe("dish-2");
    expect(entity?.course).toBe("main");
    expect(entity?.sortOrder).toBe(3);
    expect(entity?.isOptional).toBe(true);
    expect(entity?.createdAt).toBeGreaterThan(0);
    expect(entity?.updatedAt).toBeGreaterThan(0);
  });
});

// ===========================================================================
// OverrideAuditPrismaStore
// ===========================================================================

describe("OverrideAuditPrismaStore", () => {
  const store = new OverrideAuditPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT,
  );

  it("create maps fields and tenantId", async () => {
    mockOverrideAudit.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
      }),
    );

    await store.create({
      entityType: "PrepTask",
      entityId: "task-1",
      constraintId: "blockDuplicate",
      guardExpression: "status === 'active'",
      overriddenBy: "user-1",
      overrideReason: "Emergency prep needed",
      authorizedBy: "admin-1",
      authorizedAt: 1700000000000,
    });

    const call = mockOverrideAudit.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.entityType).toBe("PrepTask");
    expect(call.data.entityId).toBe("task-1");
    expect(call.data.constraintId).toBe("blockDuplicate");
    expect(call.data.guardExpression).toBe("status === 'active'");
    expect(call.data.overriddenBy).toBe("user-1");
    expect(call.data.overrideReason).toBe("Emergency prep needed");
    expect(call.data.authorizedBy).toBe("admin-1");
    expect(call.data.authorizedAt).toBeInstanceOf(Date);
  });

  it("getAll filters by tenantId only (no deletedAt column)", async () => {
    mockOverrideAudit.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockOverrideAudit.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeUndefined();
  });

  it("getById uses composite key without deletedAt", async () => {
    mockOverrideAudit.findFirst.mockResolvedValueOnce(null);
    await store.getById("oa-1");
    const call = mockOverrideAudit.findFirst.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("oa-1");
    expect(call.where.deletedAt).toBeUndefined();
  });

  it("delete performs hard delete (no deletedAt column)", async () => {
    mockOverrideAudit.delete.mockResolvedValueOnce({});
    const result = await store.delete("oa-1");
    expect(result).toBe(true);
    const call = mockOverrideAudit.delete.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.where.tenantId_id.id).toBe("oa-1");
  });

  it("mapToManifestEntity maps fields correctly", async () => {
    mockOverrideAudit.findFirst.mockResolvedValueOnce({
      id: "oa-2",
      tenantId: TENANT,
      entityType: "Recipe",
      entityId: "recipe-1",
      constraintId: "blockInactive",
      guardExpression: null,
      overriddenBy: "chef-1",
      overrideReason: "Test override",
      authorizedBy: null,
      authorizedAt: null,
      createdAt: new Date("2026-02-01"),
    });

    const entity = await store.getById("oa-2");
    expect(entity?.id).toBe("oa-2");
    expect(entity?.tenantId).toBe(TENANT);
    expect(entity?.entityType).toBe("Recipe");
    expect(entity?.entityId).toBe("recipe-1");
    expect(entity?.constraintId).toBe("blockInactive");
    expect(entity?.guardExpression).toBeNull();
    expect(entity?.overriddenBy).toBe("chef-1");
    expect(entity?.overrideReason).toBe("Test override");
    expect(entity?.authorizedBy).toBeNull();
    expect(entity?.authorizedAt).toBeNull();
    expect(entity?.createdAt).toBeGreaterThan(0);
  });
});

// ===========================================================================
// PayrollApprovalHistoryPrismaStore
// ===========================================================================

describe("PayrollApprovalHistoryPrismaStore", () => {
  const store = new PayrollApprovalHistoryPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT,
  );

  it("create maps fields and auto-sets entityType to payroll_run", async () => {
    mockApprovalHistory.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
      }),
    );

    await store.create({
      entityId: "run-1",
      action: "approved",
      performedBy: "mgr-1",
      previousStatus: "pending",
      newStatus: "approved",
      notes: "Looks good",
    });

    const call = mockApprovalHistory.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.entityType).toBe("payroll_run");
    expect(call.data.entityId).toBe("run-1");
    expect(call.data.action).toBe("approved");
    expect(call.data.performedBy).toBe("mgr-1");
    expect(call.data.previousStatus).toBe("pending");
    expect(call.data.newStatus).toBe("approved");
    expect(call.data.notes).toBe("Looks good");
  });

  it("getAll filters by tenantId and entityType payroll_run", async () => {
    mockApprovalHistory.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockApprovalHistory.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.entityType).toBe("payroll_run");
    expect(call.where.deletedAt).toBeUndefined();
  });

  it("getById filters by tenantId, id, and entityType", async () => {
    mockApprovalHistory.findFirst.mockResolvedValueOnce(null);
    await store.getById("ah-1");
    const call = mockApprovalHistory.findFirst.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("ah-1");
    expect(call.where.entityType).toBe("payroll_run");
  });

  it("delete performs hard delete (no deletedAt column)", async () => {
    mockApprovalHistory.delete.mockResolvedValueOnce({});
    const result = await store.delete("ah-1");
    expect(result).toBe(true);
    const call = mockApprovalHistory.delete.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.where.tenantId_id.id).toBe("ah-1");
  });

  it("mapToManifestEntity maps fields correctly", async () => {
    mockApprovalHistory.findFirst.mockResolvedValueOnce({
      id: "ah-2",
      tenantId: TENANT,
      entityType: "payroll_run",
      entityId: "run-2",
      action: "rejected",
      performedBy: "mgr-2",
      performedAt: new Date("2026-03-01"),
      previousStatus: "pending",
      newStatus: "rejected",
      notes: "Errors found",
      metadata: { reason: "miscalculation" },
      createdAt: new Date("2026-03-01"),
    });

    const entity = await store.getById("ah-2");
    expect(entity?.id).toBe("ah-2");
    expect(entity?.entityType).toBe("payroll_run");
    expect(entity?.entityId).toBe("run-2");
    expect(entity?.action).toBe("rejected");
    expect(entity?.performedBy).toBe("mgr-2");
    expect(entity?.previousStatus).toBe("pending");
    expect(entity?.newStatus).toBe("rejected");
    expect(entity?.notes).toBe("Errors found");
    expect(entity?.metadata).toEqual({ reason: "miscalculation" });
    expect(entity?.createdAt).toBeGreaterThan(0);
  });
});

// ===========================================================================
// PayrollPeriodPrismaStore
// ===========================================================================

describe("PayrollPeriodPrismaStore", () => {
  const store = new PayrollPeriodPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT,
  );

  it("create maps snake_case fields and tenantId", async () => {
    mockPayrollPeriods.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      }),
    );

    await store.create({
      id: "pp-1",
      periodStart: new Date("2026-04-01").getTime(),
      periodEnd: new Date("2026-04-15").getTime(),
      status: "open",
    });

    const call = mockPayrollPeriods.create.mock.calls[0][0];
    expect(call.data.tenant_id).toBe(TENANT);
    expect(call.data.period_start).toBeInstanceOf(Date);
    expect(call.data.period_end).toBeInstanceOf(Date);
    expect(call.data.status).toBe("open");
  });

  it("getAll filters by tenant_id and deleted_at null", async () => {
    mockPayrollPeriods.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockPayrollPeriods.findMany.mock.calls[0][0];
    expect(call.where.tenant_id).toBe(TENANT);
    expect(call.where.deleted_at).toBeNull();
  });

  it("getById uses snake_case composite key tenant_id_id", async () => {
    mockPayrollPeriods.findFirst.mockResolvedValueOnce(null);
    await store.getById("pp-1");
    const call = mockPayrollPeriods.findFirst.mock.calls[0][0];
    expect(call.where.tenant_id).toBe(TENANT);
    expect(call.where.id).toBe("pp-1");
    expect(call.where.deleted_at).toBeNull();
  });

  it("delete soft-deletes with deleted_at", async () => {
    mockPayrollPeriods.update.mockResolvedValueOnce({});
    const result = await store.delete("pp-1");
    expect(result).toBe(true);
    const call = mockPayrollPeriods.update.mock.calls[0][0];
    expect(call.where.tenant_id_id.tenant_id).toBe(TENANT);
    expect(call.where.tenant_id_id.id).toBe("pp-1");
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity normalizes snake_case to camelCase", async () => {
    mockPayrollPeriods.findFirst.mockResolvedValueOnce({
      id: "pp-2",
      tenant_id: TENANT,
      period_start: new Date("2026-04-01"),
      period_end: new Date("2026-04-15"),
      status: "closed",
      created_at: new Date("2026-03-28"),
      updated_at: new Date("2026-04-16"),
      deleted_at: null,
    });

    const entity = await store.getById("pp-2");
    expect(entity?.id).toBe("pp-2");
    expect(entity?.tenantId).toBe(TENANT);
    expect(entity?.periodStart).toBeGreaterThan(0);
    expect(entity?.periodEnd).toBeGreaterThan(0);
    expect(entity?.status).toBe("closed");
    expect(entity?.createdAt).toBeGreaterThan(0);
    expect(entity?.updatedAt).toBeGreaterThan(0);
    expect(entity?.deletedAt).toBeNull();
  });
});

// ===========================================================================
// PayrollRunPrismaStore
// ===========================================================================

describe("PayrollRunPrismaStore", () => {
  const store = new PayrollRunPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT,
  );

  it("create maps snake_case fields, Decimal fields, and tenantId", async () => {
    mockPayrollRuns.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      }),
    );

    await store.create({
      id: "pr-1",
      payrollPeriodId: "pp-1",
      status: "pending",
      totalGross: 50000.0,
      totalDeductions: 12000.0,
      totalNet: 38000.0,
      approvedBy: null,
    });

    const call = mockPayrollRuns.create.mock.calls[0][0];
    expect(call.data.tenant_id).toBe(TENANT);
    expect(call.data.payroll_period_id).toBe("pp-1");
    expect(call.data.status).toBe("pending");
    expect(Number(call.data.total_gross)).toBe(50000);
    expect(Number(call.data.total_deductions)).toBe(12000);
    expect(Number(call.data.total_net)).toBe(38000);
    expect(call.data.approved_by).toBeNull();
  });

  it("getAll filters by tenant_id and deleted_at null", async () => {
    mockPayrollRuns.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockPayrollRuns.findMany.mock.calls[0][0];
    expect(call.where.tenant_id).toBe(TENANT);
    expect(call.where.deleted_at).toBeNull();
  });

  it("getById uses snake_case composite key tenant_id_id", async () => {
    mockPayrollRuns.findFirst.mockResolvedValueOnce(null);
    await store.getById("pr-1");
    const call = mockPayrollRuns.findFirst.mock.calls[0][0];
    expect(call.where.tenant_id).toBe(TENANT);
    expect(call.where.id).toBe("pr-1");
    expect(call.where.deleted_at).toBeNull();
  });

  it("delete soft-deletes with deleted_at", async () => {
    mockPayrollRuns.update.mockResolvedValueOnce({});
    const result = await store.delete("pr-1");
    expect(result).toBe(true);
    const call = mockPayrollRuns.update.mock.calls[0][0];
    expect(call.where.tenant_id_id.tenant_id).toBe(TENANT);
    expect(call.where.tenant_id_id.id).toBe("pr-1");
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity normalizes snake_case and Decimal fields", async () => {
    mockPayrollRuns.findFirst.mockResolvedValueOnce({
      id: "pr-2",
      tenant_id: TENANT,
      payroll_period_id: "pp-2",
      run_date: new Date("2026-04-15"),
      status: "approved",
      total_gross: 75000.0,
      total_deductions: 18000.0,
      total_net: 57000.0,
      approved_by: "mgr-1",
      approved_at: new Date("2026-04-16"),
      paid_at: null,
      created_at: new Date("2026-04-14"),
      updated_at: new Date("2026-04-16"),
      deleted_at: null,
    });

    const entity = await store.getById("pr-2");
    expect(entity?.id).toBe("pr-2");
    expect(entity?.tenantId).toBe(TENANT);
    expect(entity?.payrollPeriodId).toBe("pp-2");
    expect(entity?.status).toBe("approved");
    expect(entity?.totalGross).toBe(75000);
    expect(entity?.totalDeductions).toBe(18000);
    expect(entity?.totalNet).toBe(57000);
    expect(entity?.approvedBy).toBe("mgr-1");
    expect(entity?.approvedAt).toBeGreaterThan(0);
    expect(entity?.paidAt).toBeNull();
    expect(entity?.createdAt).toBeGreaterThan(0);
    expect(entity?.updatedAt).toBeGreaterThan(0);
    expect(entity?.deletedAt).toBeNull();
  });
});
