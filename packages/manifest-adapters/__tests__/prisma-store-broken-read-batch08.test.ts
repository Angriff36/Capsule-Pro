/**
 * Persistence smoke tests for BROKEN_PRISMA_READ batch 08 stores.
 *
 * Covers: EventDish, EventGuest, EventImport (manifest: EventImportWorkflow),
 * EventProfitability, EventReport. Each test exercises a single tenant-scoped
 * round-trip — verifying that the where clauses include `tenantId` (or
 * `tenant_id` for snake_case models) and `deletedAt`/`deleted_at: null` for
 * soft-delete reads, and that key fields are coerced to the spelling and shape
 * the matching Prisma model expects (Decimal coercion, String[] arrays, Json
 * fields, camelCase vs snake_case field names, required Decimal defaults).
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventDishPrismaStore } from "../src/prisma-stores/broken-read-batch08-event-dish";
import {
  EventGuestPrismaStore,
  EventImportPrismaStore,
} from "../src/prisma-stores/broken-read-batch08-event-guest-import";
import {
  EventProfitabilityPrismaStore,
  EventReportPrismaStore,
} from "../src/prisma-stores/broken-read-batch08-event-profit-report";

// ---------------------------------------------------------------------------
// vi.hoisted mocks — one per Prisma model accessor
// ---------------------------------------------------------------------------

const mockEventDishes = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEventGuest = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEventImport = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEventProfitability = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEventReport = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  Prisma: {},
}));

const TENANT = "44444444-4444-4444-4444-444444444444";

interface MockClient {
  event_dishes: typeof mockEventDishes;
  eventGuest: typeof mockEventGuest;
  eventImport: typeof mockEventImport;
  eventProfitability: typeof mockEventProfitability;
  eventReport: typeof mockEventReport;
}

const prisma: MockClient = {
  event_dishes: mockEventDishes,
  eventGuest: mockEventGuest,
  eventImport: mockEventImport,
  eventProfitability: mockEventProfitability,
  eventReport: mockEventReport,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// EventDish (snake_case model: event_dishes)
// ---------------------------------------------------------------------------

describe("EventDishPrismaStore", () => {
  it("create handles snake_case fields and composite key", async () => {
    mockEventDishes.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenant_id: TENANT,
      }),
    );

    const store = new EventDishPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      dishId: "dish-1",
      course: "main",
      quantityServings: 10,
      serviceStyle: "plated",
      specialInstructions: "Gluten-free option required",
    });

    const call = mockEventDishes.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenant_id).toBe(TENANT);
    expect(call.data.event_id).toBe("evt-1");
    expect(call.data.dish_id).toBe("dish-1");
    expect(call.data.course).toBe("main");
    expect(call.data.quantity_servings).toBe(10);
    expect(call.data.service_style).toBe("plated");
    expect(call.data.special_instructions).toBe(
      "Gluten-free option required",
    );
  });

  it("getAll filters by tenant_id + deleted_at", async () => {
    mockEventDishes.findMany.mockResolvedValueOnce([]);
    const store = new EventDishPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEventDishes.findMany).toHaveBeenCalledWith({
      where: { tenant_id: TENANT, deleted_at: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deleted_at)", async () => {
    mockEventDishes.update.mockResolvedValueOnce({});
    const store = new EventDishPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("ed-1");
    expect(ok).toBe(true);
    const call = mockEventDishes.update.mock.calls[0][0] as {
      where: { tenant_id_id: { tenant_id: string; id: string } };
      data: { deleted_at: Date };
    };
    expect(call.where.tenant_id_id).toEqual({
      tenant_id: TENANT,
      id: "ed-1",
    });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EventGuest (camelCase model with @map, String[] arrays, booleans)
// ---------------------------------------------------------------------------

describe("EventGuestPrismaStore", () => {
  it("create handles String[] arrays, booleans, and nullable fields", async () => {
    mockEventGuest.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      }),
    );

    const store = new EventGuestPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      guestPhone: "+1-555-0123",
      isPrimaryContact: true,
      dietaryRestrictions: ["vegetarian", "nut-free"],
      allergenRestrictions: ["peanuts"],
      notes: "VIP guest",
      specialMealRequired: true,
      specialMealNotes: "No MSG",
      tableAssignment: "Table 5",
      mealPreference: "vegetarian",
    });

    const call = mockEventGuest.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-1");
    expect(call.data.guestName).toBe("Jane Doe");
    expect(call.data.guestEmail).toBe("jane@example.com");
    expect(call.data.guestPhone).toBe("+1-555-0123");
    expect(call.data.isPrimaryContact).toBe(true);
    expect(call.data.dietaryRestrictions).toEqual(["vegetarian", "nut-free"]);
    expect(call.data.allergenRestrictions).toEqual(["peanuts"]);
    expect(call.data.notes).toBe("VIP guest");
    expect(call.data.specialMealRequired).toBe(true);
    expect(call.data.specialMealNotes).toBe("No MSG");
    expect(call.data.tableAssignment).toBe("Table 5");
    expect(call.data.mealPreference).toBe("vegetarian");
  });

  it("getAll filters by tenantId + deletedAt", async () => {
    mockEventGuest.findMany.mockResolvedValueOnce([]);
    const store = new EventGuestPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEventGuest.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEventGuest.update.mockResolvedValueOnce({});
    const store = new EventGuestPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("guest-1");
    expect(ok).toBe(true);
    const call = mockEventGuest.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "guest-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EventImport / EventImportWorkflow (camelCase model, Json, String[], nullable eventId)
// ---------------------------------------------------------------------------

describe("EventImportPrismaStore", () => {
  it("create handles Json field, String[] array, and nullable eventId", async () => {
    mockEventImport.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      }),
    );

    const store = new EventImportPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      fileName: "event-brief.pdf",
      mimeType: "application/pdf",
      fileSize: 204800,
      blobUrl: "https://blob.example.com/file.pdf",
      fileType: "pdf",
      detectedFormat: "tpp",
      parseStatus: "pending",
      extractedData: { venue: "Grand Hall", guestCount: 200 },
      confidence: 85,
      parseErrors: ["warning: missing date"],
      reportId: "rpt-1",
      battleBoardId: "bb-1",
    });

    const call = mockEventImport.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-1");
    expect(call.data.fileName).toBe("event-brief.pdf");
    expect(call.data.mimeType).toBe("application/pdf");
    expect(call.data.fileSize).toBe(204800);
    expect(call.data.blobUrl).toBe("https://blob.example.com/file.pdf");
    expect(call.data.fileType).toBe("pdf");
    expect(call.data.detectedFormat).toBe("tpp");
    expect(call.data.parseStatus).toBe("pending");
    expect(call.data.extractedData).toEqual({
      venue: "Grand Hall",
      guestCount: 200,
    });
    expect(call.data.confidence).toBe(85);
    expect(call.data.parseErrors).toEqual(["warning: missing date"]);
    expect(call.data.reportId).toBe("rpt-1");
    expect(call.data.battleBoardId).toBe("bb-1");
  });

  it("getAll filters by tenantId + deletedAt", async () => {
    mockEventImport.findMany.mockResolvedValueOnce([]);
    const store = new EventImportPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEventImport.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEventImport.update.mockResolvedValueOnce({});
    const store = new EventImportPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("imp-1");
    expect(ok).toBe(true);
    const call = mockEventImport.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "imp-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EventProfitability (camelCase model with many required Decimal defaults)
// ---------------------------------------------------------------------------

describe("EventProfitabilityPrismaStore", () => {
  it("create handles many required Decimal fields with defaults", async () => {
    mockEventProfitability.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      }),
    );

    const store = new EventProfitabilityPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      budgetedRevenue: 50000,
      budgetedFoodCost: 15000,
      budgetedLaborCost: 10000,
      budgetedOverhead: 5000,
      budgetedTotalCost: 30000,
      budgetedGrossMargin: 20000,
      budgetedGrossMarginPct: 40,
      actualRevenue: 48000,
      actualFoodCost: 14500,
      actualLaborCost: 10200,
      actualOverhead: 5200,
      actualTotalCost: 29900,
      actualGrossMargin: 18100,
      actualGrossMarginPct: 37.7,
      revenueVariance: -2000,
      foodCostVariance: -500,
      laborCostVariance: 200,
      totalCostVariance: -100,
      marginVariancePct: -2.3,
      calculationMethod: "auto",
    });

    const call = mockEventProfitability.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-1");
    expect(call.data.budgetedRevenue).toBe(50000);
    expect(call.data.budgetedFoodCost).toBe(15000);
    expect(call.data.budgetedLaborCost).toBe(10000);
    expect(call.data.budgetedOverhead).toBe(5000);
    expect(call.data.budgetedTotalCost).toBe(30000);
    expect(call.data.budgetedGrossMargin).toBe(20000);
    expect(call.data.budgetedGrossMarginPct).toBe(40);
    expect(call.data.actualRevenue).toBe(48000);
    expect(call.data.actualFoodCost).toBe(14500);
    expect(call.data.actualLaborCost).toBe(10200);
    expect(call.data.actualOverhead).toBe(5200);
    expect(call.data.actualTotalCost).toBe(29900);
    expect(call.data.actualGrossMargin).toBe(18100);
    expect(call.data.actualGrossMarginPct).toBe(37.7);
    expect(call.data.revenueVariance).toBe(-2000);
    expect(call.data.foodCostVariance).toBe(-500);
    expect(call.data.laborCostVariance).toBe(200);
    expect(call.data.totalCostVariance).toBe(-100);
    expect(call.data.marginVariancePct).toBe(-2.3);
    expect(call.data.calculationMethod).toBe("auto");
    expect(call.data.notes).toBeNull();
  });

  it("getAll filters by tenantId + deletedAt", async () => {
    mockEventProfitability.findMany.mockResolvedValueOnce([]);
    const store = new EventProfitabilityPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEventProfitability.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEventProfitability.update.mockResolvedValueOnce({});
    const store = new EventProfitabilityPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("prof-1");
    expect(ok).toBe(true);
    const call = mockEventProfitability.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "prof-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EventReport (camelCase model with Json fields, nullable Int/DateTime)
// ---------------------------------------------------------------------------

describe("EventReportPrismaStore", () => {
  it("create handles Json fields, nullable Int, and defaults", async () => {
    mockEventReport.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      }),
    );

    const store = new EventReportPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      name: "Post-Event Report",
      version: "2026-01-01",
      status: "draft",
      completion: 0,
      checklistData: { sections: [] },
      parsedEventData: { venue: "Grand Hall" },
      reportConfig: { template: "standard" },
      autoFillScore: 12,
      reviewNotes: "Initial draft",
      reviewedBy: "user-1",
    });

    const call = mockEventReport.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-1");
    expect(call.data.name).toBe("Post-Event Report");
    expect(call.data.version).toBe("2026-01-01");
    expect(call.data.status).toBe("draft");
    expect(call.data.completion).toBe(0);
    expect(call.data.checklistData).toEqual({ sections: [] });
    expect(call.data.parsedEventData).toEqual({ venue: "Grand Hall" });
    expect(call.data.reportConfig).toEqual({ template: "standard" });
    expect(call.data.autoFillScore).toBe(12);
    expect(call.data.reviewNotes).toBe("Initial draft");
    expect(call.data.reviewedBy).toBe("user-1");
    expect(call.data.reviewedAt).toBeNull();
    expect(call.data.completedAt).toBeNull();
  });

  it("getAll filters by tenantId + deletedAt", async () => {
    mockEventReport.findMany.mockResolvedValueOnce([]);
    const store = new EventReportPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEventReport.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEventReport.update.mockResolvedValueOnce({});
    const store = new EventReportPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("rpt-1");
    expect(ok).toBe(true);
    const call = mockEventReport.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "rpt-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});
