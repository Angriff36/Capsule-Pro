/**
 * Persistence smoke tests for BROKEN_PRISMA_READ batch 06 stores.
 *
 * Covers: CycleCountSession, Dish, EmailTemplate, EmailWorkflow,
 * EmployeeAvailability. Each test exercises a single tenant-scoped round-trip
 * — verifying that the where clauses include `tenantId` (or `tenant_id` for
 * snake_case models) and `deletedAt`/`deleted_at: null` for soft-delete reads,
 * and that key fields are coerced to the spelling and shape the matching Prisma
 * model expects (Decimal coercion, JSON pass-through, String[] arrays,
 * snake_case field names).
 *
 * Failure-path semantics (silent return undefined / false on Prisma throw)
 * are already covered by the AlertsConfig + batch01-05 suites that share the
 * same `reportOp` helper, so they are not re-tested here.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CycleCountSessionPrismaStore,
  DishPrismaStore,
} from "../src/prisma-stores/broken-read-batch06-cycle-dish";
import {
  EmailTemplatePrismaStore,
  EmailWorkflowPrismaStore,
} from "../src/prisma-stores/broken-read-batch06-email";
import { EmployeeAvailabilityPrismaStore } from "../src/prisma-stores/broken-read-batch06-employee-availability";

// ---------------------------------------------------------------------------
// vi.hoisted mocks — one per Prisma model accessor
// ---------------------------------------------------------------------------

const mockCycleCountSession = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockDish = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEmailTemplates = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEmailWorkflow = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockEmployeeAvailability = vi.hoisted(() => ({
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
  cycleCountSession: typeof mockCycleCountSession;
  dish: typeof mockDish;
  email_templates: typeof mockEmailTemplates;
  emailWorkflow: typeof mockEmailWorkflow;
  employee_availability: typeof mockEmployeeAvailability;
}

const prisma: MockClient = {
  cycleCountSession: mockCycleCountSession,
  dish: mockDish,
  email_templates: mockEmailTemplates,
  emailWorkflow: mockEmailWorkflow,
  employee_availability: mockEmployeeAvailability,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// CycleCountSession
// ---------------------------------------------------------------------------

describe("CycleCountSessionPrismaStore", () => {
  it("create coerces decimal columns and defaults countType/status/counts", async () => {
    mockCycleCountSession.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      }),
    );

    const store = new CycleCountSessionPrismaStore(prisma as never, TENANT);
    await store.create({
      locationId: "loc-1",
      sessionId: "SES-001",
      sessionName: "Weekly Count",
      createdById: "emp-1",
      totalVariance: 3.5,
      variancePercentage: 1.2,
    });

    const call = mockCycleCountSession.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.locationId).toBe("loc-1");
    expect(call.data.sessionId).toBe("SES-001");
    expect(call.data.sessionName).toBe("Weekly Count");
    expect(call.data.createdById).toBe("emp-1");
    expect(call.data.countType).toBe("ad_hoc");
    expect(call.data.status).toBe("draft");
    expect(call.data.totalItems).toBe(0);
    expect(call.data.countedItems).toBe(0);
    // Mock Prisma.Decimal is undefined → toDecimalRequired passes raw value
    expect(call.data.totalVariance).toBe(3.5);
    expect(call.data.variancePercentage).toBe(1.2);
    expect(call.data.scheduledDate).toBeNull();
    expect(call.data.notes).toBeNull();
    expect(call.data.approvedById).toBeNull();
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockCycleCountSession.findMany.mockResolvedValueOnce([]);
    const store = new CycleCountSessionPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockCycleCountSession.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockCycleCountSession.update.mockResolvedValueOnce({});
    const store = new CycleCountSessionPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("session-1");
    expect(ok).toBe(true);
    const call = mockCycleCountSession.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "session-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Dish
// ---------------------------------------------------------------------------

describe("DishPrismaStore", () => {
  it("create handles String[] fields and nullable decimals", async () => {
    mockDish.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      }),
    );

    const store = new DishPrismaStore(prisma as never, TENANT);
    await store.create({
      recipeId: "recipe-1",
      name: "Grilled Salmon",
      dietaryTags: ["gluten-free", "dairy-free"],
      allergens: ["fish"],
      pricePerPerson: 29.99,
      costPerPerson: 12.5,
    });

    const call = mockDish.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.recipeId).toBe("recipe-1");
    expect(call.data.name).toBe("Grilled Salmon");
    expect(call.data.dietaryTags).toEqual(["gluten-free", "dairy-free"]);
    expect(call.data.allergens).toEqual(["fish"]);
    expect(call.data.pricePerPerson).toBe(29.99);
    expect(call.data.costPerPerson).toBe(12.5);
    expect(call.data.minPrepLeadDays).toBe(0);
    expect(call.data.isActive).toBe(true);
    expect(call.data.description).toBeNull();
    expect(call.data.category).toBeNull();
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockDish.findMany.mockResolvedValueOnce([]);
    const store = new DishPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockDish.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockDish.update.mockResolvedValueOnce({});
    const store = new DishPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("dish-1");
    expect(ok).toBe(true);
    const call = mockDish.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "dish-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EmailTemplate (snake_case model: email_templates)
// ---------------------------------------------------------------------------

describe("EmailTemplatePrismaStore", () => {
  it("create handles snake_case fields, JSON merge_fields, and enum template_type", async () => {
    mockEmailTemplates.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenant_id: TENANT,
      }),
    );

    const store = new EmailTemplatePrismaStore(prisma as never, TENANT);
    await store.create({
      name: "Proposal Template",
      template_type: "proposal",
      subject: "Your Proposal is Ready",
      body: "Dear {{name}}, ...",
      merge_fields: ["name", "event_date", "total"],
    });

    const call = mockEmailTemplates.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenant_id).toBe(TENANT);
    expect(call.data.name).toBe("Proposal Template");
    expect(call.data.template_type).toBe("proposal");
    expect(call.data.subject).toBe("Your Proposal is Ready");
    expect(call.data.body).toBe("Dear {{name}}, ...");
    expect(call.data.merge_fields).toEqual(["name", "event_date", "total"]);
    expect(call.data.is_active).toBe(true);
    expect(call.data.is_default).toBe(false);
  });

  it("getAll filters by tenant_id + deleted_at", async () => {
    mockEmailTemplates.findMany.mockResolvedValueOnce([]);
    const store = new EmailTemplatePrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEmailTemplates.findMany).toHaveBeenCalledWith({
      where: { tenant_id: TENANT, deleted_at: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deleted_at)", async () => {
    mockEmailTemplates.update.mockResolvedValueOnce({});
    const store = new EmailTemplatePrismaStore(prisma as never, TENANT);
    const ok = await store.delete("tmpl-1");
    expect(ok).toBe(true);
    const call = mockEmailTemplates.update.mock.calls[0][0] as {
      where: { tenant_id_id: { tenant_id: string; id: string } };
      data: { deleted_at: Date };
    };
    expect(call.where.tenant_id_id).toEqual({
      tenant_id: TENANT,
      id: "tmpl-1",
    });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EmailWorkflow
// ---------------------------------------------------------------------------

describe("EmailWorkflowPrismaStore", () => {
  it("create handles JSON configs and nullable template FK", async () => {
    mockEmailWorkflow.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      }),
    );

    const store = new EmailWorkflowPrismaStore(prisma as never, TENANT);
    await store.create({
      name: "Event Confirmation",
      triggerType: "event_confirmed",
      triggerConfig: { delay: 0, channel: "email" },
      recipientConfig: { roles: ["event_manager"] },
    });

    const call = mockEmailWorkflow.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.name).toBe("Event Confirmation");
    expect(call.data.triggerType).toBe("event_confirmed");
    expect(call.data.triggerConfig).toEqual({
      delay: 0,
      channel: "email",
    });
    expect(call.data.recipientConfig).toEqual({ roles: ["event_manager"] });
    expect(call.data.isActive).toBe(true);
    expect(call.data.emailTemplateId).toBeNull();
    expect(call.data.emailTemplateTenantId).toBeNull();
    expect(call.data.lastTriggeredAt).toBeNull();
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockEmailWorkflow.findMany.mockResolvedValueOnce([]);
    const store = new EmailWorkflowPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockEmailWorkflow.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockEmailWorkflow.update.mockResolvedValueOnce({});
    const store = new EmailWorkflowPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("wf-1");
    expect(ok).toBe(true);
    const call = mockEmailWorkflow.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "wf-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// EmployeeAvailability (snake_case model: employee_availability)
// ---------------------------------------------------------------------------

describe("EmployeeAvailabilityPrismaStore", () => {
  it("create handles snake_case fields, time values, and effective_from default", async () => {
    mockEmployeeAvailability.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenant_id: TENANT,
      }),
    );

    const store = new EmployeeAvailabilityPrismaStore(
      prisma as never,
      TENANT,
    );
    await store.create({
      employee_id: "emp-1",
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "17:00:00",
    });

    const call = mockEmployeeAvailability.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenant_id).toBe(TENANT);
    expect(call.data.employee_id).toBe("emp-1");
    expect(call.data.day_of_week).toBe(1);
    expect(call.data.start_time).toBe("09:00:00");
    expect(call.data.end_time).toBe("17:00:00");
    expect(call.data.is_available).toBe(true);
    expect(call.data.effective_from).toBeInstanceOf(Date);
    expect(call.data.effective_until).toBeNull();
  });

  it("getAll filters by tenant_id + deleted_at", async () => {
    mockEmployeeAvailability.findMany.mockResolvedValueOnce([]);
    const store = new EmployeeAvailabilityPrismaStore(
      prisma as never,
      TENANT,
    );
    await store.getAll();
    expect(mockEmployeeAvailability.findMany).toHaveBeenCalledWith({
      where: { tenant_id: TENANT, deleted_at: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deleted_at)", async () => {
    mockEmployeeAvailability.update.mockResolvedValueOnce({});
    const store = new EmployeeAvailabilityPrismaStore(
      prisma as never,
      TENANT,
    );
    const ok = await store.delete("avail-1");
    expect(ok).toBe(true);
    const call = mockEmployeeAvailability.update.mock.calls[0][0] as {
      where: { tenant_id_id: { tenant_id: string; id: string } };
      data: { deleted_at: Date };
    };
    expect(call.where.tenant_id_id).toEqual({
      tenant_id: TENANT,
      id: "avail-1",
    });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });
});
