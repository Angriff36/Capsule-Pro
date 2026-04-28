/**
 * Persistence smoke tests for BROKEN_PRISMA_READ batch 03 stores.
 *
 * Covers: BudgetLineItem, BulkOrderRule, CateringOrder, ChartOfAccount,
 * Client. Each test exercises one CRUD round-trip — create → list → assert
 * tenant-scoped where clauses fired and the manifest entity round-trips
 * its key fields. Failure modes (silent return undefined / false) are
 * not deeply re-tested here; the AlertsConfig + batch02 suites cover that
 * shared error-reporting path.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BudgetLineItemPrismaStore,
  BulkOrderRulePrismaStore,
  CateringOrderPrismaStore,
} from "../src/prisma-stores/broken-read-batch03-budget-bulk-catering";
import {
  ChartOfAccountPrismaStore,
  ClientPrismaStore,
} from "../src/prisma-stores/broken-read-batch03-chart-client";

const mockBudgetLineItem = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockBulkOrderRule = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockCateringOrder = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockChartOfAccount = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockClient = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  Prisma: {},
}));

const TENANT = "11111111-1111-1111-1111-111111111111";

interface MockClient {
  budgetLineItem: typeof mockBudgetLineItem;
  bulkOrderRule: typeof mockBulkOrderRule;
  cateringOrder: typeof mockCateringOrder;
  chartOfAccount: typeof mockChartOfAccount;
  client: typeof mockClient;
}

const prisma: MockClient = {
  budgetLineItem: mockBudgetLineItem,
  bulkOrderRule: mockBulkOrderRule,
  cateringOrder: mockCateringOrder,
  chartOfAccount: mockChartOfAccount,
  client: mockClient,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("BudgetLineItemPrismaStore", () => {
  it("create persists tenant-scoped row with required Decimal amounts", async () => {
    mockBudgetLineItem.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new BudgetLineItemPrismaStore(
      prisma as never,
      TENANT
    );
    const result = await store.create({
      budgetId: "budget-1",
      category: "labor",
      name: "Line",
      budgetedAmount: 100,
      actualAmount: 75,
      varianceAmount: 25,
    });

    const call = mockBudgetLineItem.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.budgetedAmount).toBe(100);
    expect(call.data.actualAmount).toBe(75);
    expect(result.tenantId).toBe(TENANT);
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockBudgetLineItem.findMany.mockResolvedValueOnce([]);
    const store = new BudgetLineItemPrismaStore(
      prisma as never,
      TENANT
    );
    await store.getAll();
    expect(mockBudgetLineItem.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });
});

describe("BulkOrderRulePrismaStore", () => {
  it("create persists required minimumQuantity Decimal", async () => {
    mockBulkOrderRule.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );
    const store = new BulkOrderRulePrismaStore(
      prisma as never,
      TENANT
    );
    await store.create({
      catalogEntryId: "cat-1",
      ruleName: "10% off",
      minimumQuantity: 50,
      ruleType: "discount",
      action: "percent",
    });

    const call = mockBulkOrderRule.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.minimumQuantity).toBe(50);
    expect(call.data.shippingIncluded).toBe(false);
    expect(call.data.isActive).toBe(true);
  });
});

describe("CateringOrderPrismaStore", () => {
  it("create persists snake_case + camelCase amounts as required Decimals", async () => {
    mockCateringOrder.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );
    const store = new CateringOrderPrismaStore(prisma as never, TENANT);
    await store.create({
      customer_id: "cust-1",
      orderNumber: "ORD-1",
      delivery_time: "12:00",
      subtotalAmount: 100,
      taxAmount: 8,
      totalAmount: 108,
    });

    const call = mockCateringOrder.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.subtotal_amount).toBe(100);
    expect(call.data.tax_amount).toBe(8);
    expect(call.data.totalAmount).toBe(108);
    expect(call.data.order_status).toBe("draft");
  });
});

describe("ChartOfAccountPrismaStore", () => {
  it("create coerces accountType to a valid enum value", async () => {
    mockChartOfAccount.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );
    const store = new ChartOfAccountPrismaStore(prisma as never, TENANT);
    await store.create({
      accountNumber: "1000",
      accountName: "Cash",
      accountType: "asset", // lowercase should become ASSET
    });

    const call = mockChartOfAccount.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.accountType).toBe("ASSET");
  });

  it("falls back to ASSET when accountType is invalid", async () => {
    mockChartOfAccount.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );
    const store = new ChartOfAccountPrismaStore(prisma as never, TENANT);
    await store.create({
      accountNumber: "9999",
      accountName: "Mystery",
      accountType: "BOGUS",
    });

    const call = mockChartOfAccount.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.accountType).toBe("ASSET");
  });

  it("getAll does NOT filter on deletedAt (no soft-delete column)", async () => {
    mockChartOfAccount.findMany.mockResolvedValueOnce([]);
    const store = new ChartOfAccountPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockChartOfAccount.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT },
      orderBy: { id: "desc" },
    });
  });

  it("delete is hard-delete (no soft-delete column)", async () => {
    mockChartOfAccount.delete.mockResolvedValueOnce({});
    const store = new ChartOfAccountPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("acct-1");
    expect(ok).toBe(true);
    expect(mockChartOfAccount.delete).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TENANT, id: "acct-1" } },
    });
  });
});

describe("ClientPrismaStore", () => {
  it("create accepts both snake_case and camelCase aliases", async () => {
    mockClient.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );
    const store = new ClientPrismaStore(prisma as never, TENANT);
    await store.create({
      clientType: "company",
      companyName: "Acme Catering", // camelCase → company_name
      first_name: "Jane",
      lastName: "Doe", // camelCase → last_name
      email: "jane@acme.test",
      defaultPaymentTerms: 45,
      tags: ["vip", "weekly"],
    });

    const call = mockClient.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.company_name).toBe("Acme Catering");
    expect(call.data.first_name).toBe("Jane");
    expect(call.data.last_name).toBe("Doe");
    expect(call.data.defaultPaymentTerms).toBe(45);
    expect(call.data.tags).toEqual(["vip", "weekly"]);
    expect(call.data.taxExempt).toBe(false);
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockClient.update.mockResolvedValueOnce({});
    const store = new ClientPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("client-1");
    expect(ok).toBe(true);
    const call = mockClient.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "client-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});
