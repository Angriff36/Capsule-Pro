/**
 * Persistence tests for BROKEN_PRISMA_READ Batch 10
 *
 * Entities: InventoryTransaction, KitchenTask, LaborBudget, Lead, Menu
 *
 * KitchenTask and Menu have existing inline stores — these tests verify
 * they remain correct. InventoryTransaction, LaborBudget, and Lead have
 * new batch10 stores.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted mocks — one per Prisma model accessor
// ---------------------------------------------------------------------------

const mockInventoryTransaction = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockKitchenTask = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockKitchenTaskClaim = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockLaborBudget = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockLead = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockMenu = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
  updateMany: vi.fn(),
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
  inventoryTransaction: typeof mockInventoryTransaction;
  kitchenTask: typeof mockKitchenTask;
  kitchenTaskClaim: typeof mockKitchenTaskClaim;
  laborBudget: typeof mockLaborBudget;
  lead: typeof mockLead;
  menu: typeof mockMenu;
}

const prisma: MockClient = {
  inventoryTransaction: mockInventoryTransaction,
  kitchenTask: mockKitchenTask,
  kitchenTaskClaim: mockKitchenTaskClaim,
  laborBudget: mockLaborBudget,
  lead: mockLead,
  menu: mockMenu,
};

// Import stores AFTER mocks are set up
const { InventoryTransactionPrismaStore } = await import(
  "../src/prisma-stores/broken-read-batch10-inventory-transaction.js"
);
const { LaborBudgetPrismaStore, LeadPrismaStore } = await import(
  "../src/prisma-stores/broken-read-batch10-labor-budget-lead.js"
);
const { KitchenTaskPrismaStore, MenuPrismaStore } = await import(
  "../src/prisma-store.js"
);

const TENANT = "55555555-5555-5555-5555-555555555555";
const OTHER_TENANT = "66666666-6666-6666-6666-666666666666";

beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// InventoryTransactionPrismaStore
// ===========================================================================

describe("InventoryTransactionPrismaStore", () => {
  const store = new InventoryTransactionPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT
  );

  it("create maps mixed snake_case/camelCase fields and tenantId", async () => {
    mockInventoryTransaction.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
      })
    );

    await store.create({
      itemId: "item-1",
      transactionType: "receipt",
      quantity: 50,
      unitCost: 12.5,
      totalCost: 625,
      reference: "PO-123",
      notes: "Monthly delivery",
      transactionDate: 1_700_000_000_000,
      storageLocationId: "loc-1",
      reason: "reorder",
      referenceType: "purchase_order",
      referenceId: "ref-1",
      employeeId: "emp-1",
    });

    const call = mockInventoryTransaction.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.itemId).toBe("item-1");
    expect(call.data.transactionType).toBe("receipt");
    // Decimal fields are wrapped by Prisma.Decimal stub
    expect(Number(call.data.quantity)).toBe(50);
    expect(Number(call.data.unit_cost)).toBe(12.5);
    expect(Number(call.data.total_cost)).toBe(625);
    expect(call.data.reference).toBe("PO-123");
    expect(call.data.storage_location_id).toBe("loc-1");
    expect(call.data.employee_id).toBe("emp-1");
  });

  it("getAll filters by tenantId only (no deletedAt column)", async () => {
    mockInventoryTransaction.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockInventoryTransaction.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeUndefined();
  });

  it("getById uses composite key without deletedAt", async () => {
    mockInventoryTransaction.findFirst.mockResolvedValueOnce(null);
    await store.getById("txn-1");
    const call = mockInventoryTransaction.findFirst.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("txn-1");
    expect(call.where.deletedAt).toBeUndefined();
  });

  it("delete performs hard delete (no deletedAt column)", async () => {
    mockInventoryTransaction.delete.mockResolvedValueOnce({});
    const result = await store.delete("txn-1");
    expect(result).toBe(true);
    const call = mockInventoryTransaction.delete.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.where.tenantId_id.id).toBe("txn-1");
  });

  it("mapToManifestEntity normalizes snake_case fields to camelCase", async () => {
    mockInventoryTransaction.findFirst.mockResolvedValueOnce({
      id: "txn-2",
      tenantId: TENANT,
      itemId: "item-2",
      transactionType: "adjustment",
      quantity: 10,
      unit_cost: 5.0,
      total_cost: 50.0,
      reference: "ADJ-1",
      notes: "Cycle count",
      transaction_date: new Date("2026-01-15"),
      createdAt: new Date("2026-01-15"),
      storage_location_id: "loc-2",
      reason: "cycle_count",
      referenceType: null,
      referenceId: null,
      employee_id: null,
    });

    const entity = await store.getById("txn-2");
    expect(entity?.unitCost).toBe(5.0);
    expect(entity?.totalCost).toBe(50.0);
    expect(entity?.transactionDate).toBeGreaterThan(0);
    expect(entity?.storageLocationId).toBe("loc-2");
    expect(entity?.employeeId).toBeNull();
    expect(entity?.referenceType).toBeNull();
  });
});

// ===========================================================================
// KitchenTaskPrismaStore (existing inline store — verify wiring)
// ===========================================================================

describe("KitchenTaskPrismaStore", () => {
  const store = new KitchenTaskPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT
  );

  it("create maps fields and tenantId", async () => {
    mockKitchenTask.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );
    mockKitchenTaskClaim.findMany.mockResolvedValueOnce([]);

    await store.create({
      id: "kt-1",
      title: "Prep sauces",
      summary: "Make all sauces for dinner service",
      status: "pending",
      priority: 3,
      complexity: 4,
      tags: ["sauce", "prep"],
    });

    const call = mockKitchenTask.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.title).toBe("Prep sauces");
    expect(call.data.status).toBe("pending");
    expect(call.data.tags).toEqual(["sauce", "prep"]);
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockKitchenTask.findMany.mockResolvedValueOnce([]);
    mockKitchenTaskClaim.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockKitchenTask.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with deletedAt", async () => {
    mockKitchenTask.findFirst.mockResolvedValueOnce({
      id: "kt-1",
      tenantId: TENANT,
    });
    mockKitchenTask.update.mockResolvedValueOnce({});

    const result = await store.delete("kt-1");
    expect(result).toBe(true);
    const call = mockKitchenTask.update.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ===========================================================================
// LaborBudgetPrismaStore
// ===========================================================================

describe("LaborBudgetPrismaStore", () => {
  const store = new LaborBudgetPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT
  );

  it("create maps Decimal, Boolean threshold fields", async () => {
    mockLaborBudget.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    await store.create({
      name: "Q2 Kitchen Budget",
      budgetType: "monthly",
      budgetTarget: 25_000,
      budgetUnit: "dollars",
      actualSpend: 18_000,
      threshold80Pct: true,
      threshold90Pct: true,
      threshold100Pct: false,
      status: "active",
      locationId: "loc-1",
      eventId: null,
    });

    const call = mockLaborBudget.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.name).toBe("Q2 Kitchen Budget");
    // Decimal fields wrapped by Prisma.Decimal stub
    expect(Number(call.data.budgetTarget)).toBe(25_000);
    expect(call.data.threshold80Pct).toBe(true);
    expect(call.data.threshold100Pct).toBe(false);
    expect(call.data.status).toBe("active");
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockLaborBudget.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockLaborBudget.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("getById uses composite key tenantId_id", async () => {
    mockLaborBudget.findFirst.mockResolvedValueOnce(null);
    await store.getById("lb-1");
    const call = mockLaborBudget.findFirst.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("lb-1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with composite key", async () => {
    mockLaborBudget.update.mockResolvedValueOnce({});
    const result = await store.delete("lb-1");
    expect(result).toBe(true);
    const call = mockLaborBudget.update.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity maps fields correctly", async () => {
    mockLaborBudget.findFirst.mockResolvedValueOnce({
      id: "lb-2",
      tenantId: TENANT,
      locationId: "loc-2",
      eventId: null,
      name: "Annual Budget",
      description: "Yearly labor budget",
      budgetType: "annual",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      budgetTarget: 120_000,
      budgetUnit: "dollars",
      actualSpend: 45_000,
      threshold80Pct: true,
      threshold90Pct: true,
      threshold100Pct: true,
      status: "active",
      overrideReason: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
    });

    const entity = await store.getById("lb-2");
    expect(entity?.name).toBe("Annual Budget");
    expect(entity?.budgetTarget).toBe(120_000);
    expect(entity?.actualSpend).toBe(45_000);
    expect(entity?.threshold80Pct).toBe(true);
    expect(entity?.status).toBe("active");
  });
});

// ===========================================================================
// LeadPrismaStore
// ===========================================================================

describe("LeadPrismaStore", () => {
  const store = new LeadPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT
  );

  it("create maps nullable Decimal, DateTime, String fields", async () => {
    mockLead.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    await store.create({
      source: "website",
      companyName: "Acme Corp",
      contactName: "Jane Doe",
      contactEmail: "jane@acme.com",
      eventType: "wedding",
      estimatedGuests: 150,
      estimatedValue: 15_000,
      status: "new",
      notes: "Interested in full catering package",
    });

    const call = mockLead.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.contactName).toBe("Jane Doe");
    // Decimal fields wrapped by Prisma.Decimal stub
    expect(Number(call.data.estimatedValue)).toBe(15_000);
    expect(call.data.estimatedGuests).toBe(150);
    expect(call.data.status).toBe("new");
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockLead.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockLead.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("getById uses composite key tenantId_id", async () => {
    mockLead.findFirst.mockResolvedValueOnce(null);
    await store.getById("lead-1");
    const call = mockLead.findFirst.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("lead-1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with composite key", async () => {
    mockLead.update.mockResolvedValueOnce({});
    const result = await store.delete("lead-1");
    expect(result).toBe(true);
    const call = mockLead.update.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity maps fields correctly", async () => {
    mockLead.findFirst.mockResolvedValueOnce({
      id: "lead-2",
      tenantId: TENANT,
      source: "referral",
      companyName: "Big Events Inc",
      contactName: "Bob Smith",
      contactEmail: "bob@bigevents.com",
      contactPhone: "+1234567890",
      eventType: "corporate",
      eventDate: new Date("2026-06-15"),
      estimatedGuests: 200,
      estimatedValue: 25_000,
      status: "qualified",
      assignedTo: "emp-1",
      notes: "Needs custom menu",
      convertedToClientId: null,
      convertedAt: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
    });

    const entity = await store.getById("lead-2");
    expect(entity?.contactName).toBe("Bob Smith");
    expect(entity?.estimatedValue).toBe(25_000);
    expect(entity?.estimatedGuests).toBe(200);
    expect(entity?.status).toBe("qualified");
    expect(entity?.convertedToClientId).toBeNull();
  });
});

// ===========================================================================
// MenuPrismaStore (existing inline store — verify wiring)
// ===========================================================================

describe("MenuPrismaStore", () => {
  const store = new MenuPrismaStore(
    prisma as unknown as import("@repo/database/standalone").PrismaClient,
    TENANT
  );

  it("create maps Decimal and Boolean fields", async () => {
    mockMenu.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    await store.create({
      id: "menu-1",
      name: "Wedding Package",
      description: "Premium wedding menu",
      category: "wedding",
      isActive: true,
      basePrice: 5000,
      pricePerPerson: 75,
      minGuests: 50,
      maxGuests: 200,
    });

    const call = mockMenu.create.mock.calls[0][0];
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.name).toBe("Wedding Package");
    expect(call.data.isActive).toBe(true);
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockMenu.findMany.mockResolvedValueOnce([]);
    await store.getAll();
    const call = mockMenu.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with composite key", async () => {
    mockMenu.update.mockResolvedValueOnce({});
    const result = await store.delete("menu-1");
    expect(result).toBe(true);
    const call = mockMenu.update.mock.calls[0][0];
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});
