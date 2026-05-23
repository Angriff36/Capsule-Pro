/**
 * Persistence smoke tests for BROKEN_PRISMA_READ batch 07 stores.
 *
 * Covers: EmployeeCertification, EmployeeDeduction, Event, EventBudget,
 * EventContract. Each test exercises a single tenant-scoped round-trip —
 * verifying that the where clauses include `tenantId` (or `tenant_id` for
 * snake_case models) and `deletedAt`/`deleted_at: null` for soft-delete reads,
 * and that key fields are coerced to the spelling and shape the matching Prisma
 * model expects (Decimal coercion, String[] arrays, camelCase vs snake_case
 * field names, required Decimal defaults).
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmployeeCertificationPrismaStore,
  EmployeeDeductionPrismaStore,
} from "../src/prisma-stores/broken-read-batch07-employee";
import {
  EventBudgetPrismaStore,
  EventContractPrismaStore,
  EventPrismaStore,
} from "../src/prisma-stores/broken-read-batch07-event";

// ---------------------------------------------------------------------------
// vi.hoisted mocks — one per Prisma model accessor
// ---------------------------------------------------------------------------

const mockEmployeeCertifications = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEmployeeDeduction = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEvent = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEventBudget = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEventContract = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  Prisma: {},
}));

const TENANT = "33333333-3333-3333-3333-333333333333";

interface MockClient {
  employee_certifications: typeof mockEmployeeCertifications;
  employeeDeduction: typeof mockEmployeeDeduction;
  event: typeof mockEvent;
  eventBudget: typeof mockEventBudget;
  eventContract: typeof mockEventContract;
}

const prisma: MockClient = {
  employee_certifications: mockEmployeeCertifications,
  employeeDeduction: mockEmployeeDeduction,
  event: mockEvent,
  eventBudget: mockEventBudget,
  eventContract: mockEventContract,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// EmployeeCertification (snake_case model: employee_certifications)
// ---------------------------------------------------------------------------

describe("EmployeeCertificationPrismaStore", () => {
  it("create handles snake_case fields and date columns", async () => {
    mockEmployeeCertifications.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenant_id: TENANT,
      })
    );

    const store = new EmployeeCertificationPrismaStore(prisma as never, TENANT);
    await store.create({
      employee_id: "emp-1",
      certification_type: "food_safety",
      certification_name: "ServSafe Manager",
      issued_date: "2025-01-15",
      expiry_date: "2026-01-15",
      document_url: "https://example.com/cert.pdf",
    });

    const call = mockEmployeeCertifications.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenant_id).toBe(TENANT);
    expect(call.data.employee_id).toBe("emp-1");
    expect(call.data.certification_type).toBe("food_safety");
    expect(call.data.certification_name).toBe("ServSafe Manager");
    expect(call.data.issued_date).toBeInstanceOf(Date);
    expect(call.data.expiry_date).toBeInstanceOf(Date);
    expect(call.data.document_url).toBe("https://example.com/cert.pdf");
  });

  it("getAll filters by tenant_id + deleted_at", async () => {
    mockEmployeeCertifications.findMany.mockResolvedValueOnce([]);
    const store = new EmployeeCertificationPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEmployeeCertifications.findMany).toHaveBeenCalledWith({
      where: { tenant_id: TENANT, deleted_at: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deleted_at)", async () => {
    mockEmployeeCertifications.update.mockResolvedValueOnce({});
    const store = new EmployeeCertificationPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("cert-1");
    expect(ok).toBe(true);
    const call = mockEmployeeCertifications.update.mock.calls[0][0] as {
      where: { tenant_id_id: { tenant_id: string; id: string } };
      data: { deleted_at: Date };
    };
    expect(call.where.tenant_id_id).toEqual({
      tenant_id: TENANT,
      id: "cert-1",
    });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EmployeeDeduction (camelCase model: EmployeeDeduction, snake_case fields)
// ---------------------------------------------------------------------------

describe("EmployeeDeductionPrismaStore", () => {
  it("create handles nullable Decimal columns and boolean default", async () => {
    mockEmployeeDeduction.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenant_id: TENANT,
      })
    );

    const store = new EmployeeDeductionPrismaStore(prisma as never, TENANT);
    await store.create({
      employee_id: "emp-2",
      type: "tax",
      name: "Federal Income Tax",
      amount: 150.0,
      percentage: 12.5,
      is_pre_tax: true,
      effective_date: "2026-01-01",
    });

    const call = mockEmployeeDeduction.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenant_id).toBe(TENANT);
    expect(call.data.employee_id).toBe("emp-2");
    expect(call.data.type).toBe("tax");
    expect(call.data.name).toBe("Federal Income Tax");
    expect(call.data.amount).toBe(150.0);
    expect(call.data.percentage).toBe(12.5);
    expect(call.data.is_pre_tax).toBe(true);
    expect(call.data.effective_date).toBeInstanceOf(Date);
    expect(call.data.end_date).toBeNull();
    expect(call.data.max_annual_amount).toBeNull();
  });

  it("getAll filters by tenant_id + deleted_at", async () => {
    mockEmployeeDeduction.findMany.mockResolvedValueOnce([]);
    const store = new EmployeeDeductionPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEmployeeDeduction.findMany).toHaveBeenCalledWith({
      where: { tenant_id: TENANT, deleted_at: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deleted_at)", async () => {
    mockEmployeeDeduction.update.mockResolvedValueOnce({});
    const store = new EmployeeDeductionPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("ded-1");
    expect(ok).toBe(true);
    const call = mockEmployeeDeduction.update.mock.calls[0][0] as {
      where: { tenant_id_id: { tenant_id: string; id: string } };
      data: { deleted_at: Date };
    };
    expect(call.where.tenant_id_id).toEqual({
      tenant_id: TENANT,
      id: "ded-1",
    });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Event (camelCase model with @map fields)
// ---------------------------------------------------------------------------

describe("EventPrismaStore", () => {
  it("create handles String[] arrays, nullable Decimals, and defaults", async () => {
    mockEvent.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new EventPrismaStore(prisma as never, TENANT);
    await store.create({
      eventType: "wedding",
      eventDate: "2026-06-15",
      title: "Smith Wedding",
      guestCount: 150,
      budget: 25_000.0,
      ticketPrice: 150.0,
      accessibilityOptions: ["wheelchair", "sign_language"],
      tags: ["outdoor", "summer"],
      venueName: "Grand Ballroom",
      venueAddress: "123 Main St",
    });

    const call = mockEvent.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventType).toBe("wedding");
    expect(call.data.title).toBe("Smith Wedding");
    expect(call.data.guestCount).toBe(150);
    expect(call.data.status).toBe("confirmed");
    expect(call.data.budget).toBe(25_000.0);
    expect(call.data.ticketPrice).toBe(150.0);
    expect(call.data.accessibilityOptions).toEqual([
      "wheelchair",
      "sign_language",
    ]);
    expect(call.data.tags).toEqual(["outdoor", "summer"]);
    expect(call.data.venueName).toBe("Grand Ballroom");
    expect(call.data.venueAddress).toBe("123 Main St");
    expect(call.data.clientId).toBeNull();
    expect(call.data.eventNumber).toBeNull();
  });

  it("getAll filters by tenantId + deletedAt", async () => {
    mockEvent.findMany.mockResolvedValueOnce([]);
    const store = new EventPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEvent.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEvent.update.mockResolvedValueOnce({});
    const store = new EventPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("evt-1");
    expect(ok).toBe(true);
    const call = mockEvent.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "evt-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EventBudget (camelCase model with @map, required Decimal defaults)
// ---------------------------------------------------------------------------

describe("EventBudgetPrismaStore", () => {
  it("create handles required Decimal defaults and version/status", async () => {
    mockEventBudget.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new EventBudgetPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      totalBudgetAmount: 50_000.0,
      totalActualAmount: 48_000.0,
      varianceAmount: 2000.0,
      variancePercentage: 4.0,
    });

    const call = mockEventBudget.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-1");
    expect(call.data.version).toBe(1);
    expect(call.data.status).toBe("draft");
    expect(call.data.totalBudgetAmount).toBe(50_000.0);
    expect(call.data.totalActualAmount).toBe(48_000.0);
    expect(call.data.varianceAmount).toBe(2000.0);
    expect(call.data.variancePercentage).toBe(4.0);
    expect(call.data.notes).toBeNull();
  });

  it("getAll filters by tenantId + deletedAt", async () => {
    mockEventBudget.findMany.mockResolvedValueOnce([]);
    const store = new EventBudgetPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEventBudget.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEventBudget.update.mockResolvedValueOnce({});
    const store = new EventBudgetPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("budget-1");
    expect(ok).toBe(true);
    const call = mockEventBudget.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "budget-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EventContract (camelCase model with @map)
// ---------------------------------------------------------------------------

describe("EventContractPrismaStore", () => {
  it("create handles nullable fields and default title/status", async () => {
    mockEventContract.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new EventContractPrismaStore(prisma as never, TENANT);
    await store.create({
      eventId: "evt-1",
      clientId: "client-1",
      contractNumber: "CTR-2026-001",
      title: "Smith Wedding Contract",
      documentUrl: "https://example.com/contract.pdf",
      documentType: "pdf",
    });

    const call = mockEventContract.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.eventId).toBe("evt-1");
    expect(call.data.clientId).toBe("client-1");
    expect(call.data.contractNumber).toBe("CTR-2026-001");
    expect(call.data.title).toBe("Smith Wedding Contract");
    expect(call.data.status).toBe("draft");
    expect(call.data.documentUrl).toBe("https://example.com/contract.pdf");
    expect(call.data.documentType).toBe("pdf");
    expect(call.data.signingToken).toBeNull();
    expect(call.data.expiresAt).toBeNull();
    expect(call.data.notes).toBeNull();
  });

  it("getAll filters by tenantId + deletedAt", async () => {
    mockEventContract.findMany.mockResolvedValueOnce([]);
    const store = new EventContractPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEventContract.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEventContract.update.mockResolvedValueOnce({});
    const store = new EventContractPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("contract-1");
    expect(ok).toBe(true);
    const call = mockEventContract.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "contract-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});
