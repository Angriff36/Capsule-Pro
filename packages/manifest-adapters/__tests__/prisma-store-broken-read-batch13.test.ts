/**
 * Persistence tests for BROKEN_PRISMA_READ batch 13.
 *
 * Entities: TrainingModule, VarianceReport, VendorCatalog, VendorContract,
 *           PurchaseOrderItem, ProposalLineItem, ScheduleShift, ShipmentItem
 */

import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Shared helpers re-created inline (avoids import of prisma-store internals)
// ---------------------------------------------------------------------------

/** Minimal Decimal stand-in for mock rows with Decimal fields. */
class DecimalStub {
  constructor(public readonly value: string) {}
  toString() {
    return this.value;
  }
}

const TID = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-01-15T10:00:00Z");
const NOW_MS = NOW.getTime();

// ---------------------------------------------------------------------------
// Hoisted mocks — one per Prisma model
// ---------------------------------------------------------------------------

const mockTrainingModule = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockVarianceReport = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockVendorCatalog = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockVendorContract = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockPurchaseOrderItem = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockProposalLineItem = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockScheduleShift = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockShipmentItem = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock client + import redirect
// ---------------------------------------------------------------------------

vi.mock("@repo/database/standalone", () => ({
  PrismaClient: class {},
  Prisma: {},
}));

interface MockClient {
  trainingModule: typeof mockTrainingModule;
  varianceReport: typeof mockVarianceReport;
  vendorCatalog: typeof mockVendorCatalog;
  vendorContract: typeof mockVendorContract;
  purchaseOrderItem: typeof mockPurchaseOrderItem;
  proposalLineItem: typeof mockProposalLineItem;
  scheduleShift: typeof mockScheduleShift;
  shipmentItem: typeof mockShipmentItem;
}

function makeMockClient(): MockClient {
  return {
    trainingModule: { ...mockTrainingModule },
    varianceReport: { ...mockVarianceReport },
    vendorCatalog: { ...mockVendorCatalog },
    vendorContract: { ...mockVendorContract },
    purchaseOrderItem: { ...mockPurchaseOrderItem },
    proposalLineItem: { ...mockProposalLineItem },
    scheduleShift: { ...mockScheduleShift },
    shipmentItem: { ...mockShipmentItem },
  };
}

// ---------------------------------------------------------------------------
// Imports (after vi.mock)
// ---------------------------------------------------------------------------

import {
  ProposalLineItemPrismaStore,
  PurchaseOrderItemPrismaStore,
} from "../src/prisma-stores/broken-read-batch13-order-proposal.js";
import {
  ScheduleShiftPrismaStore,
  ShipmentItemPrismaStore,
} from "../src/prisma-stores/broken-read-batch13-schedule-shipment.js";
import {
  TrainingModulePrismaStore,
  VarianceReportPrismaStore,
} from "../src/prisma-stores/broken-read-batch13-training-variance.js";
import {
  VendorCatalogPrismaStore,
  VendorContractPrismaStore,
} from "../src/prisma-stores/broken-read-batch13-vendor.js";

// ===========================================================================
// TrainingModulePrismaStore
// ===========================================================================

describe("TrainingModulePrismaStore", () => {
  // Prisma always exposes the model field name (camelCase) regardless of
  // @map("snake_case") in schema.prisma. Earlier fixtures used snake_case
  // keys (matching the DB column names) — that's what Prisma writes to the
  // database, but it is NOT what the Prisma client returns or accepts in
  // where:/data: clauses. Fixtures and assertions below use the camelCase
  // model field names, matching the actual Prisma surface and the store
  // source.
  const fakeRow = {
    tenantId: TID,
    id: "mod-1",
    title: "Safety Training",
    description: "Basic safety",
    contentUrl: "https://example.com/safety.pdf",
    contentType: "document",
    durationMinutes: 30,
    category: "safety",
    isRequired: true,
    isActive: true,
    createdBy: "user-1",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps fields and tenantId", async () => {
    const client = makeMockClient();
    client.trainingModule.create.mockResolvedValue(fakeRow);
    const store = new TrainingModulePrismaStore(
      client as unknown as Parameters<typeof TrainingModulePrismaStore>[0],
      TID
    );
    await store.create({
      title: "Safety Training",
      description: "Basic safety",
      contentUrl: "https://example.com/safety.pdf",
      contentType: "document",
      durationMinutes: 30,
      category: "safety",
      isRequired: true,
      isActive: true,
      createdBy: "user-1",
    });
    expect(client.trainingModule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        title: "Safety Training",
        description: "Basic safety",
        isRequired: true,
        isActive: true,
      }),
    });
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    const client = makeMockClient();
    client.trainingModule.findMany.mockResolvedValue([fakeRow]);
    const store = new TrainingModulePrismaStore(
      client as unknown as Parameters<typeof TrainingModulePrismaStore>[0],
      TID
    );
    const result = await store.getAll();
    expect(client.trainingModule.findMany).toHaveBeenCalledWith({
      where: { tenantId: TID, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("mod-1");
  });

  it("getById uses composite key tenantId_id", async () => {
    const client = makeMockClient();
    client.trainingModule.findFirst.mockResolvedValue(fakeRow);
    const store = new TrainingModulePrismaStore(
      client as unknown as Parameters<typeof TrainingModulePrismaStore>[0],
      TID
    );
    const result = await store.getById("mod-1");
    expect(client.trainingModule.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "mod-1", deletedAt: null },
    });
    expect(result?.id).toBe("mod-1");
  });

  it("update patches camelCase fields", async () => {
    const client = makeMockClient();
    client.trainingModule.update.mockResolvedValue(fakeRow);
    const store = new TrainingModulePrismaStore(
      client as unknown as Parameters<typeof TrainingModulePrismaStore>[0],
      TID
    );
    await store.update("mod-1", { title: "Updated" });
    expect(client.trainingModule.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "mod-1" } },
      data: expect.objectContaining({ title: "Updated" }),
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.trainingModule.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new TrainingModulePrismaStore(
      client as unknown as Parameters<typeof TrainingModulePrismaStore>[0],
      TID
    );
    const result = await store.delete("mod-1");
    expect(client.trainingModule.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "mod-1" } },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toBe(true);
  });

  it("mapToManifestEntity maps fields correctly", async () => {
    const client = makeMockClient();
    client.trainingModule.findMany.mockResolvedValue([fakeRow]);
    const store = new TrainingModulePrismaStore(
      client as unknown as Parameters<typeof TrainingModulePrismaStore>[0],
      TID
    );
    const [entity] = await store.getAll();
    expect(entity).toEqual(
      expect.objectContaining({
        id: "mod-1",
        tenantId: TID,
        title: "Safety Training",
        description: "Basic safety",
        contentUrl: "https://example.com/safety.pdf",
        contentType: "document",
        durationMinutes: 30,
        category: "safety",
        isRequired: true,
        isActive: true,
        createdBy: "user-1",
        createdAt: NOW_MS,
        updatedAt: NOW_MS,
        deletedAt: null,
      })
    );
  });
});

// ===========================================================================
// VarianceReportPrismaStore
// ===========================================================================

describe("VarianceReportPrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: "vr-1",
    sessionId: "session-1",
    reportType: "cycle_count",
    itemId: "item-1",
    itemNumber: "ITM-001",
    itemName: "Flour",
    expectedQuantity: new DecimalStub("100.000"),
    countedQuantity: new DecimalStub("95.000"),
    variance: new DecimalStub("-5.000"),
    variancePct: new DecimalStub("-5.00"),
    accuracyScore: new DecimalStub("95.00"),
    status: "pending",
    adjustmentType: null,
    adjustmentAmount: null,
    adjustmentDate: null,
    notes: null,
    rootCause: null,
    resolutionNotes: null,
    resolvedById: null,
    resolvedAt: null,
    generatedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps fields and tenantId", async () => {
    const client = makeMockClient();
    client.varianceReport.create.mockResolvedValue(fakeRow);
    const store = new VarianceReportPrismaStore(
      client as unknown as Parameters<typeof VarianceReportPrismaStore>[0],
      TID
    );
    await store.create({
      sessionId: "session-1",
      reportType: "cycle_count",
      itemId: "item-1",
      itemNumber: "ITM-001",
      itemName: "Flour",
      expectedQuantity: "100",
      countedQuantity: "95",
      variance: "-5",
      variancePct: "-5",
      accuracyScore: "95",
    });
    expect(client.varianceReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        sessionId: "session-1",
        reportType: "cycle_count",
        itemId: "item-1",
        itemNumber: "ITM-001",
        itemName: "Flour",
        status: "pending",
      }),
    });
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    const client = makeMockClient();
    client.varianceReport.findMany.mockResolvedValue([fakeRow]);
    const store = new VarianceReportPrismaStore(
      client as unknown as Parameters<typeof VarianceReportPrismaStore>[0],
      TID
    );
    const result = await store.getAll();
    expect(client.varianceReport.findMany).toHaveBeenCalledWith({
      where: { tenantId: TID, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
  });

  it("getById uses composite key tenantId_id", async () => {
    const client = makeMockClient();
    client.varianceReport.findFirst.mockResolvedValue(fakeRow);
    const store = new VarianceReportPrismaStore(
      client as unknown as Parameters<typeof VarianceReportPrismaStore>[0],
      TID
    );
    await store.getById("vr-1");
    expect(client.varianceReport.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "vr-1", deletedAt: null },
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.varianceReport.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new VarianceReportPrismaStore(
      client as unknown as Parameters<typeof VarianceReportPrismaStore>[0],
      TID
    );
    const result = await store.delete("vr-1");
    expect(client.varianceReport.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "vr-1" } },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toBe(true);
  });

  it("mapToManifestEntity maps Decimal fields as strings", async () => {
    const client = makeMockClient();
    client.varianceReport.findMany.mockResolvedValue([fakeRow]);
    const store = new VarianceReportPrismaStore(
      client as unknown as Parameters<typeof VarianceReportPrismaStore>[0],
      TID
    );
    const [entity] = await store.getAll();
    expect(entity.expectedQuantity).toBe("100.000");
    expect(entity.countedQuantity).toBe("95.000");
    expect(entity.variance).toBe("-5.000");
    expect(entity.status).toBe("pending");
  });
});

// ===========================================================================
// VendorCatalogPrismaStore
// ===========================================================================

describe("VendorCatalogPrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: "vc-1",
    supplierId: "sup-1",
    itemNumber: "SKU-001",
    itemName: "Flour 50kg",
    description: "All purpose flour",
    category: "dry_goods",
    baseUnitCost: new DecimalStub("25.00"),
    currency: "USD",
    unitOfMeasure: "kg",
    leadTimeDays: 5,
    leadTimeMinDays: 3,
    leadTimeMaxDays: 7,
    minimumOrderQuantity: new DecimalStub("100.000"),
    orderMultiple: new DecimalStub("50.000"),
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
    supplierSku: "VSKU-001",
    notes: null,
    tags: ["dry", "bulk"],
    lastCostUpdate: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps fields including tags", async () => {
    const client = makeMockClient();
    client.vendorCatalog.create.mockResolvedValue(fakeRow);
    const store = new VendorCatalogPrismaStore(
      client as unknown as Parameters<typeof VendorCatalogPrismaStore>[0],
      TID
    );
    await store.create({
      supplierId: "sup-1",
      itemNumber: "SKU-001",
      itemName: "Flour 50kg",
      baseUnitCost: "25",
      unitOfMeasure: "kg",
      tags: ["dry", "bulk"],
    });
    expect(client.vendorCatalog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        supplierId: "sup-1",
        tags: ["dry", "bulk"],
      }),
    });
  });

  it("getAll filters by tenantId and deletedAt null", async () => {
    const client = makeMockClient();
    client.vendorCatalog.findMany.mockResolvedValue([fakeRow]);
    const store = new VendorCatalogPrismaStore(
      client as unknown as Parameters<typeof VendorCatalogPrismaStore>[0],
      TID
    );
    const result = await store.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].tags).toEqual(["dry", "bulk"]);
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.vendorCatalog.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new VendorCatalogPrismaStore(
      client as unknown as Parameters<typeof VendorCatalogPrismaStore>[0],
      TID
    );
    const result = await store.delete("vc-1");
    expect(result).toBe(true);
    expect(client.vendorCatalog.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "vc-1" } },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("mapToManifestEntity maps Decimal fields as strings", async () => {
    const client = makeMockClient();
    client.vendorCatalog.findMany.mockResolvedValue([fakeRow]);
    const store = new VendorCatalogPrismaStore(
      client as unknown as Parameters<typeof VendorCatalogPrismaStore>[0],
      TID
    );
    const [entity] = await store.getAll();
    expect(entity.baseUnitCost).toBe("25.00");
    expect(entity.minimumOrderQuantity).toBe("100.000");
    expect(entity.currency).toBe("USD");
  });
});

// ===========================================================================
// VendorContractPrismaStore
// ===========================================================================

describe("VendorContractPrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: "vcon-1",
    contractNumber: "VC-2026-001",
    vendorId: "vendor-1",
    vendorName: "Acme Supplies",
    contractType: "purchase",
    status: "draft",
    startDate: NOW,
    endDate: null,
    autoRenew: false,
    renewalTermDays: 365,
    noticeDaysBeforeRenewal: 30,
    paymentTerms: "NET_30",
    deliveryTerms: null,
    minimumOrderQuantity: new DecimalStub("0"),
    annualSpendCommitment: new DecimalStub("0"),
    spendToPeriod: null,
    currencyCode: "USD",
    approvedBy: null,
    approvedAt: null,
    terminatedBy: null,
    terminatedAt: null,
    terminationReason: null,
    contractUrl: null,
    notes: null,
    complianceScore: 100,
    lastComplianceReview: null,
    slaBreachCount: 0,
    onTimeDeliveryRate: new DecimalStub("0"),
    qualityRating: new DecimalStub("0"),
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps fields", async () => {
    const client = makeMockClient();
    client.vendorContract.create.mockResolvedValue(fakeRow);
    const store = new VendorContractPrismaStore(
      client as unknown as Parameters<typeof VendorContractPrismaStore>[0],
      TID
    );
    await store.create({
      vendorId: "vendor-1",
      vendorName: "Acme Supplies",
      contractType: "purchase",
      paymentTerms: "NET_30",
    });
    expect(client.vendorContract.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        vendorId: "vendor-1",
        vendorName: "Acme Supplies",
        contractType: "purchase",
        paymentTerms: "NET_30",
      }),
    });
  });

  it("update patches status and contract fields", async () => {
    const client = makeMockClient();
    client.vendorContract.update.mockResolvedValue(fakeRow);
    const store = new VendorContractPrismaStore(
      client as unknown as Parameters<typeof VendorContractPrismaStore>[0],
      TID
    );
    await store.update("vcon-1", { status: "active", complianceScore: 95 });
    expect(client.vendorContract.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "vcon-1" } },
      data: expect.objectContaining({ status: "active", complianceScore: 95 }),
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.vendorContract.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new VendorContractPrismaStore(
      client as unknown as Parameters<typeof VendorContractPrismaStore>[0],
      TID
    );
    expect(await store.delete("vcon-1")).toBe(true);
  });
});

// ===========================================================================
// PurchaseOrderItemPrismaStore
// ===========================================================================

describe("PurchaseOrderItemPrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: "poi-1",
    purchaseOrderId: "po-1",
    itemId: "item-1",
    quantityOrdered: new DecimalStub("100.00"),
    quantityReceived: new DecimalStub("0.00"),
    unitId: 1,
    unitCost: new DecimalStub("5.0000"),
    totalCost: new DecimalStub("500.00"),
    qualityStatus: "pending",
    discrepancyType: null,
    discrepancyAmount: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps Decimal fields", async () => {
    const client = makeMockClient();
    client.purchaseOrderItem.create.mockResolvedValue(fakeRow);
    const store = new PurchaseOrderItemPrismaStore(
      client as unknown as Parameters<typeof PurchaseOrderItemPrismaStore>[0],
      TID
    );
    await store.create({
      purchaseOrderId: "po-1",
      itemId: "item-1",
      quantityOrdered: "100",
      unitCost: "5",
      totalCost: "500",
    });
    expect(client.purchaseOrderItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        purchaseOrderId: "po-1",
        itemId: "item-1",
      }),
    });
  });

  it("getById uses composite key tenantId_id", async () => {
    const client = makeMockClient();
    client.purchaseOrderItem.findFirst.mockResolvedValue(fakeRow);
    const store = new PurchaseOrderItemPrismaStore(
      client as unknown as Parameters<typeof PurchaseOrderItemPrismaStore>[0],
      TID
    );
    await store.getById("poi-1");
    expect(client.purchaseOrderItem.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "poi-1", deletedAt: null },
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.purchaseOrderItem.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new PurchaseOrderItemPrismaStore(
      client as unknown as Parameters<typeof PurchaseOrderItemPrismaStore>[0],
      TID
    );
    expect(await store.delete("poi-1")).toBe(true);
  });

  it("mapToManifestEntity maps Decimal fields as strings", async () => {
    const client = makeMockClient();
    client.purchaseOrderItem.findMany.mockResolvedValue([fakeRow]);
    const store = new PurchaseOrderItemPrismaStore(
      client as unknown as Parameters<typeof PurchaseOrderItemPrismaStore>[0],
      TID
    );
    const [entity] = await store.getAll();
    expect(entity.quantityOrdered).toBe("100.00");
    expect(entity.unitCost).toBe("5.0000");
    expect(entity.totalCost).toBe("500.00");
    expect(entity.purchaseOrderId).toBe("po-1");
  });
});

// ===========================================================================
// ProposalLineItemPrismaStore
// ===========================================================================

describe("ProposalLineItemPrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: "pli-1",
    proposalId: "prop-1",
    itemType: "food",
    category: "main",
    description: "Grilled chicken",
    quantity: new DecimalStub("50.00"),
    unitOfMeasure: "portions",
    unitPrice: new DecimalStub("12.00"),
    total: new DecimalStub("600.00"),
    totalPrice: new DecimalStub("600.00"),
    sortOrder: 1,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps fields", async () => {
    const client = makeMockClient();
    client.proposalLineItem.create.mockResolvedValue(fakeRow);
    const store = new ProposalLineItemPrismaStore(
      client as unknown as Parameters<typeof ProposalLineItemPrismaStore>[0],
      TID
    );
    await store.create({
      proposalId: "prop-1",
      itemType: "food",
      category: "main",
      description: "Grilled chicken",
      quantity: "50",
      unitPrice: "12",
      total: "600",
      totalPrice: "600",
      sortOrder: 1,
    });
    expect(client.proposalLineItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        proposalId: "prop-1",
        itemType: "food",
        category: "main",
        description: "Grilled chicken",
      }),
    });
  });

  it("update patches quantity and price", async () => {
    const client = makeMockClient();
    client.proposalLineItem.update.mockResolvedValue(fakeRow);
    const store = new ProposalLineItemPrismaStore(
      client as unknown as Parameters<typeof ProposalLineItemPrismaStore>[0],
      TID
    );
    await store.update("pli-1", { quantity: "75", notes: "Updated count" });
    expect(client.proposalLineItem.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "pli-1" } },
      data: expect.objectContaining({ notes: "Updated count" }),
    });
  });

  it("delete soft-deletes", async () => {
    const client = makeMockClient();
    client.proposalLineItem.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new ProposalLineItemPrismaStore(
      client as unknown as Parameters<typeof ProposalLineItemPrismaStore>[0],
      TID
    );
    expect(await store.delete("pli-1")).toBe(true);
  });
});

// ===========================================================================
// ScheduleShiftPrismaStore
// ===========================================================================

describe("ScheduleShiftPrismaStore", () => {
  const SHIFT_START = new Date("2026-01-15T08:00:00Z");
  const SHIFT_END = new Date("2026-01-15T16:00:00Z");

  const fakeRow = {
    tenantId: TID,
    id: "ss-1",
    scheduleId: "sched-1",
    employeeId: "emp-1",
    locationId: "loc-1",
    shift_start: SHIFT_START,
    shift_end: SHIFT_END,
    role_during_shift: "Line Cook",
    notes: "Regular shift",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps snake_case shift fields", async () => {
    const client = makeMockClient();
    client.scheduleShift.create.mockResolvedValue(fakeRow);
    const store = new ScheduleShiftPrismaStore(
      client as unknown as Parameters<typeof ScheduleShiftPrismaStore>[0],
      TID
    );
    await store.create({
      scheduleId: "sched-1",
      employeeId: "emp-1",
      locationId: "loc-1",
      shiftStart: SHIFT_START.getTime(),
      shiftEnd: SHIFT_END.getTime(),
      roleDuringShift: "Line Cook",
    });
    expect(client.scheduleShift.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        scheduleId: "sched-1",
        employeeId: "emp-1",
        locationId: "loc-1",
        role_during_shift: "Line Cook",
      }),
    });
  });

  it("mapToManifestEntity maps snake_case to camelCase", async () => {
    const client = makeMockClient();
    client.scheduleShift.findMany.mockResolvedValue([fakeRow]);
    const store = new ScheduleShiftPrismaStore(
      client as unknown as Parameters<typeof ScheduleShiftPrismaStore>[0],
      TID
    );
    const [entity] = await store.getAll();
    expect(entity.shiftStart).toBe(SHIFT_START.getTime());
    expect(entity.shiftEnd).toBe(SHIFT_END.getTime());
    expect(entity.roleDuringShift).toBe("Line Cook");
    expect(entity.scheduleId).toBe("sched-1");
  });

  it("update patches shift times via both naming conventions", async () => {
    const client = makeMockClient();
    client.scheduleShift.update.mockResolvedValue(fakeRow);
    const store = new ScheduleShiftPrismaStore(
      client as unknown as Parameters<typeof ScheduleShiftPrismaStore>[0],
      TID
    );
    await store.update("ss-1", { roleDuringShift: "Sous Chef" });
    expect(client.scheduleShift.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "ss-1" } },
      data: expect.objectContaining({ role_during_shift: "Sous Chef" }),
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.scheduleShift.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new ScheduleShiftPrismaStore(
      client as unknown as Parameters<typeof ScheduleShiftPrismaStore>[0],
      TID
    );
    expect(await store.delete("ss-1")).toBe(true);
  });
});

// ===========================================================================
// ShipmentItemPrismaStore
// ===========================================================================

describe("ShipmentItemPrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: "si-1",
    shipmentId: "ship-1",
    itemId: "item-1",
    quantityShipped: new DecimalStub("200.000"),
    quantityReceived: new DecimalStub("0.000"),
    quantityDamaged: new DecimalStub("0.000"),
    unitId: 1,
    unitCost: new DecimalStub("3.5000"),
    totalCost: new DecimalStub("700.00"),
    condition: "good",
    conditionNotes: null,
    lotNumber: "LOT-001",
    expirationDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  it("create maps Decimal fields", async () => {
    const client = makeMockClient();
    client.shipmentItem.create.mockResolvedValue(fakeRow);
    const store = new ShipmentItemPrismaStore(
      client as unknown as Parameters<typeof ShipmentItemPrismaStore>[0],
      TID
    );
    await store.create({
      shipmentId: "ship-1",
      itemId: "item-1",
      quantityShipped: "200",
      totalCost: "700",
      lotNumber: "LOT-001",
    });
    expect(client.shipmentItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TID,
        shipmentId: "ship-1",
        itemId: "item-1",
        lotNumber: "LOT-001",
      }),
    });
  });

  it("getById uses composite key tenantId_id", async () => {
    const client = makeMockClient();
    client.shipmentItem.findFirst.mockResolvedValue(fakeRow);
    const store = new ShipmentItemPrismaStore(
      client as unknown as Parameters<typeof ShipmentItemPrismaStore>[0],
      TID
    );
    await store.getById("si-1");
    expect(client.shipmentItem.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: "si-1", deletedAt: null },
    });
  });

  it("update patches quantities", async () => {
    const client = makeMockClient();
    client.shipmentItem.update.mockResolvedValue(fakeRow);
    const store = new ShipmentItemPrismaStore(
      client as unknown as Parameters<typeof ShipmentItemPrismaStore>[0],
      TID
    );
    await store.update("si-1", {
      quantityReceived: "195",
      quantityDamaged: "5",
    });
    expect(client.shipmentItem.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: "si-1" } },
      data: expect.objectContaining({
        quantityReceived: expect.anything(),
        quantityDamaged: expect.anything(),
      }),
    });
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.shipmentItem.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: NOW,
    });
    const store = new ShipmentItemPrismaStore(
      client as unknown as Parameters<typeof ShipmentItemPrismaStore>[0],
      TID
    );
    expect(await store.delete("si-1")).toBe(true);
  });

  it("mapToManifestEntity maps Decimal fields as strings", async () => {
    const client = makeMockClient();
    client.shipmentItem.findMany.mockResolvedValue([fakeRow]);
    const store = new ShipmentItemPrismaStore(
      client as unknown as Parameters<typeof ShipmentItemPrismaStore>[0],
      TID
    );
    const [entity] = await store.getAll();
    expect(entity.quantityShipped).toBe("200.000");
    expect(entity.totalCost).toBe("700.00");
    expect(entity.lotNumber).toBe("LOT-001");
    expect(entity.condition).toBe("good");
  });
});
