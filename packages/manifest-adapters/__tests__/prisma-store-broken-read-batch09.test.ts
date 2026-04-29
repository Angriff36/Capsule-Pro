/**
 * Persistence smoke tests for BROKEN_PRISMA_READ batch 09 stores.
 *
 * Covers: EventStaffAssignment (manifest: EventStaff), EventSummary, Ingredient,
 * InventoryItem, InventorySupplier. Each test exercises a single tenant-scoped
 * round-trip — verifying that the where clauses include `tenantId` and
 * `deletedAt: null` for soft-delete reads, and that key fields are coerced to
 * the spelling and shape the matching Prisma model expects (Decimal coercion,
 * String[] arrays, Json fields, camelCase vs snake_case field names, nullable
 * DateTime fields, mixed Prisma field naming).
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EventStaffAssignmentPrismaStore,
  EventSummaryPrismaStore,
} from "../src/prisma-stores/broken-read-batch09-event-staff-summary";
import { IngredientPrismaStore } from "../src/prisma-stores/broken-read-batch09-ingredient";
import {
  InventoryItemPrismaStore,
  InventorySupplierPrismaStore,
} from "../src/prisma-stores/broken-read-batch09-inventory";

// ---------------------------------------------------------------------------
// vi.hoisted mocks — one per Prisma model accessor
// ---------------------------------------------------------------------------

const mockEventStaffAssignment = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEventSummary = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockIngredient = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockInventoryItem = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockInventorySupplier = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  Prisma: {},
}));

const TENANT = "55555555-5555-5555-5555-555555555555";
const OTHER_TENANT = "66666666-6666-6666-6666-666666666666";

interface MockClient {
  eventStaffAssignment: typeof mockEventStaffAssignment;
  eventSummary: typeof mockEventSummary;
  ingredient: typeof mockIngredient;
  inventoryItem: typeof mockInventoryItem;
  inventorySupplier: typeof mockInventorySupplier;
}

const prisma: MockClient = {
  eventStaffAssignment: mockEventStaffAssignment,
  eventSummary: mockEventSummary,
  ingredient: mockIngredient,
  inventoryItem: mockInventoryItem,
  inventorySupplier: mockInventorySupplier,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// EventStaffAssignment (manifest entity: EventStaff)
// ---------------------------------------------------------------------------

describe("EventStaffAssignmentPrismaStore", () => {
  it("create maps fields and tenantId to eventStaffAssignment", async () => {
    mockEventStaffAssignment.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    const store = new EventStaffAssignmentPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      employeeId: "emp-1",
      role: "bartender",
      startTime: "2026-04-28T10:00:00Z",
      endTime: "2026-04-28T18:00:00Z",
      notes: "Late shift",
    });

    const call = mockEventStaffAssignment.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-1");
    expect(call.data.employeeId).toBe("emp-1");
    expect(call.data.role).toBe("bartender");
    expect(call.data.notes).toBe("Late shift");
    // startTime/endTime should be Date or null
    expect(call.data.startTime).toBeInstanceOf(Date);
    expect(call.data.endTime).toBeInstanceOf(Date);
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockEventStaffAssignment.findMany.mockResolvedValueOnce([]);
    const store = new EventStaffAssignmentPrismaStore(prisma as never, TENANT);
    await store.getAll();

    const call = mockEventStaffAssignment.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("getById uses composite key tenantId_id", async () => {
    mockEventStaffAssignment.findFirst.mockResolvedValueOnce(null);
    const store = new EventStaffAssignmentPrismaStore(prisma as never, TENANT);
    await store.getById("staff-1");

    const call = mockEventStaffAssignment.findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("staff-1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with deletedAt", async () => {
    mockEventStaffAssignment.update.mockResolvedValueOnce({});
    const store = new EventStaffAssignmentPrismaStore(prisma as never, TENANT);
    await store.delete("staff-1");

    const call = mockEventStaffAssignment.update.mock.calls[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.where.tenantId_id.id).toBe("staff-1");
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("tenant isolation — other tenant data is not returned", async () => {
    mockEventStaffAssignment.findMany.mockResolvedValueOnce([
      { id: "s-1", tenantId: TENANT, role: "server" },
    ]);
    const store = new EventStaffAssignmentPrismaStore(prisma as never, TENANT);
    const result = await store.getAll();

    const call = mockEventStaffAssignment.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    // Only the correct tenant is queried
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.tenantId).not.toBe(OTHER_TENANT);
  });
});

// ---------------------------------------------------------------------------
// EventSummary
// ---------------------------------------------------------------------------

describe("EventSummaryPrismaStore", () => {
  it("create maps Json fields and nullable strings", async () => {
    mockEventSummary.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    const store = new EventSummaryPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-2",
      highlights: ["Great food", "Happy guests"],
      issues: ["Ran out of wine"],
      financialPerformance: { revenue: 5000 },
      clientFeedback: [{ rating: 5 }],
      insights: ["Popular menu"],
      overallSummary: "Successful event",
      generationDurationMs: 1200,
    });

    const call = mockEventSummary.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-2");
    expect(call.data.highlights).toEqual(["Great food", "Happy guests"]);
    expect(call.data.issues).toEqual(["Ran out of wine"]);
    expect(call.data.overallSummary).toBe("Successful event");
    expect(call.data.generationDurationMs).toBe(1200);
    expect(call.data.generatedAt).toBeInstanceOf(Date);
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockEventSummary.findMany.mockResolvedValueOnce([]);
    const store = new EventSummaryPrismaStore(prisma as never, TENANT);
    await store.getAll();

    const call = mockEventSummary.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with composite key", async () => {
    mockEventSummary.update.mockResolvedValueOnce({});
    const store = new EventSummaryPrismaStore(prisma as never, TENANT);
    await store.delete("sum-1");

    const call = mockEventSummary.update.mock.calls[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Ingredient
// ---------------------------------------------------------------------------

describe("IngredientPrismaStore", () => {
  it("create maps Decimal, String[], Boolean fields", async () => {
    mockIngredient.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    const store = new IngredientPrismaStore(prisma as never, TENANT);
    await store.create({
      name: "Flour",
      category: "Dry Goods",
      defaultUnitId: 2,
      densityGPerMl: 0.59,
      shelfLifeDays: 180,
      storageInstructions: "Cool, dry place",
      allergens: ["gluten", "wheat"],
      isActive: true,
    });

    const call = mockIngredient.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.name).toBe("Flour");
    expect(call.data.category).toBe("Dry Goods");
    expect(call.data.defaultUnitId).toBe(2);
    // densityGPerMl should be a Decimal input (number in test env)
    expect(call.data.densityGPerMl).toBe(0.59);
    expect(call.data.shelfLifeDays).toBe(180);
    expect(call.data.storageInstructions).toBe("Cool, dry place");
    expect(call.data.allergens).toEqual(["gluten", "wheat"]);
    expect(call.data.isActive).toBe(true);
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockIngredient.findMany.mockResolvedValueOnce([]);
    const store = new IngredientPrismaStore(prisma as never, TENANT);
    await store.getAll();

    const call = mockIngredient.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("getById uses composite key tenantId_id", async () => {
    mockIngredient.findFirst.mockResolvedValueOnce(null);
    const store = new IngredientPrismaStore(prisma as never, TENANT);
    await store.getById("ing-1");

    const call = mockIngredient.findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("ing-1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with deletedAt", async () => {
    mockIngredient.update.mockResolvedValueOnce({});
    const store = new IngredientPrismaStore(prisma as never, TENANT);
    await store.delete("ing-1");

    const call = mockIngredient.update.mock.calls[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity returns allergens as array", async () => {
    mockIngredient.findFirst.mockResolvedValueOnce({
      id: "ing-1",
      tenantId: TENANT,
      name: "Sugar",
      category: "Sweetener",
      defaultUnitId: 1,
      densityGPerMl: null,
      shelfLifeDays: null,
      storageInstructions: null,
      allergens: ["none"],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const store = new IngredientPrismaStore(prisma as never, TENANT);
    const entity = await store.getById("ing-1");

    expect(entity?.allergens).toEqual(["none"]);
    expect(entity?.name).toBe("Sugar");
  });
});

// ---------------------------------------------------------------------------
// InventoryItem (mixed camelCase/snake_case Prisma field names)
// ---------------------------------------------------------------------------

describe("InventoryItemPrismaStore", () => {
  it("create maps Decimal, String[], mixed-case fields", async () => {
    mockInventoryItem.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    const store = new InventoryItemPrismaStore(prisma as never, TENANT);
    await store.create({
      itemNumber: "SKU-001",
      name: "Olive Oil",
      category: "Oils",
      unitOfMeasure: "liter",
      unitCost: 12.5,
      quantityOnHand: 10,
      parLevel: 5,
      reorderLevel: 3,
      tags: ["organic", "imported"],
      supplierId: "sup-1",
      fsaStatus: "compliant",
    });

    const call = mockInventoryItem.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.item_number).toBe("SKU-001");
    expect(call.data.name).toBe("Olive Oil");
    expect(call.data.category).toBe("Oils");
    expect(call.data.unitOfMeasure).toBe("liter");
    // Decimal fields — raw numbers in test mock env
    expect(call.data.unitCost).toBe(12.5);
    expect(call.data.quantityOnHand).toBe(10);
    expect(call.data.tags).toEqual(["organic", "imported"]);
    expect(call.data.supplierId).toBe("sup-1");
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockInventoryItem.findMany.mockResolvedValueOnce([]);
    const store = new InventoryItemPrismaStore(prisma as never, TENANT);
    await store.getAll();

    const call = mockInventoryItem.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with composite key", async () => {
    mockInventoryItem.update.mockResolvedValueOnce({});
    const store = new InventoryItemPrismaStore(prisma as never, TENANT);
    await store.delete("item-1");

    const call = mockInventoryItem.update.mock.calls[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity maps snake_case fields to camelCase output", async () => {
    mockInventoryItem.findFirst.mockResolvedValueOnce({
      id: "item-1",
      tenantId: TENANT,
      item_number: "SKU-002",
      name: "Salt",
      description: "Sea salt",
      category: "Seasoning",
      unitOfMeasure: "kg",
      unitCost: 5.0,
      quantityOnHand: 20,
      parLevel: 10,
      reorder_level: 5,
      supplierId: null,
      tags: ["kosher"],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      fsa_status: "compliant",
      fsa_temp_logged: true,
      fsa_allergen_info: false,
      fsa_traceable: true,
    });
    const store = new InventoryItemPrismaStore(prisma as never, TENANT);
    const entity = await store.getById("item-1");

    expect(entity?.name).toBe("Salt");
    expect(entity?.itemNumber).toBe("SKU-002");
    expect(entity?.reorderLevel).toBe(5);
    expect(entity?.fsaStatus).toBe("compliant");
    expect(entity?.tags).toEqual(["kosher"]);
  });
});

// ---------------------------------------------------------------------------
// InventorySupplier (mixed camelCase/snake_case Prisma field names)
// ---------------------------------------------------------------------------

describe("InventorySupplierPrismaStore", () => {
  it("create maps Json, String[], mixed-case fields", async () => {
    mockInventorySupplier.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    );

    const store = new InventorySupplierPrismaStore(prisma as never, TENANT);
    await store.create({
      supplierNumber: "SUP-001",
      name: "Fresh Foods Co",
      contactPerson: "John Doe",
      email: "john@freshfoods.com",
      phone: "555-1234",
      paymentTerms: "NET_15",
      connectorType: "api",
      connectorCredentials: { apiKey: "abc123" },
      notes: "Preferred vendor",
      tags: ["organic", "local"],
    });

    const call = mockInventorySupplier.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.supplier_number).toBe("SUP-001");
    expect(call.data.name).toBe("Fresh Foods Co");
    expect(call.data.contact_person).toBe("John Doe");
    expect(call.data.email).toBe("john@freshfoods.com");
    expect(call.data.payment_terms).toBe("NET_15");
    expect(call.data.connectorType).toBe("api");
    expect(call.data.connectorCredentials).toEqual({ apiKey: "abc123" });
    expect(call.data.tags).toEqual(["organic", "local"]);
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    mockInventorySupplier.findMany.mockResolvedValueOnce([]);
    const store = new InventorySupplierPrismaStore(prisma as never, TENANT);
    await store.getAll();

    const call = mockInventorySupplier.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.deletedAt).toBeNull();
  });

  it("getById uses composite key tenantId_id", async () => {
    mockInventorySupplier.findFirst.mockResolvedValueOnce(null);
    const store = new InventorySupplierPrismaStore(prisma as never, TENANT);
    await store.getById("sup-1");

    const call = mockInventorySupplier.findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tenantId).toBe(TENANT);
    expect(call.where.id).toBe("sup-1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("delete soft-deletes with composite key", async () => {
    mockInventorySupplier.update.mockResolvedValueOnce({});
    const store = new InventorySupplierPrismaStore(prisma as never, TENANT);
    await store.delete("sup-1");

    const call = mockInventorySupplier.update.mock.calls[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.where.tenantId_id.tenantId).toBe(TENANT);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("mapToManifestEntity maps snake_case fields to camelCase output", async () => {
    mockInventorySupplier.findFirst.mockResolvedValueOnce({
      id: "sup-1",
      tenantId: TENANT,
      supplier_number: "SUP-002",
      name: "Spice House",
      contact_person: "Jane",
      email: "jane@spice.com",
      phone: null,
      payment_terms: "NET_30",
      connectorType: null,
      connectorCredentials: {},
      notes: null,
      tags: ["bulk"],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const store = new InventorySupplierPrismaStore(prisma as never, TENANT);
    const entity = await store.getById("sup-1");

    expect(entity?.name).toBe("Spice House");
    expect(entity?.supplierNumber).toBe("SUP-002");
    expect(entity?.contactPerson).toBe("Jane");
    expect(entity?.paymentTerms).toBe("NET_30");
    expect(entity?.tags).toEqual(["bulk"]);
  });
});
