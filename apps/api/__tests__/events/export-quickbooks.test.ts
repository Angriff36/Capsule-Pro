/**
 * Tests for POST /api/events/export/quickbooks
 * Pins the #20 select narrowing on the export (take:1000): the route selects
 * only the consumed Event scalars + the client/budgets relations, and the
 * nested lineItems select narrows to the 4 consumed fields — while producing
 * an unchanged QuickBooks invoice export.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    event: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@repo/storage", () => ({
  uploadFile: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { uploadFile } from "@repo/storage";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { POST } from "../../app/api/events/export/quickbooks/route";

const mockAuth = vi.mocked(auth);
const mockGetTenantId = vi.mocked(getTenantIdForOrg);
const mockEventFindMany = vi.mocked(database.event.findMany);
const mockUploadFile = vi.mocked(uploadFile);

const selectOf = (call: unknown): Record<string, unknown> =>
  (call as { select?: Record<string, unknown> })?.select ?? {};

describe("POST /api/events/export/quickbooks", () => {
  const tenantId = "tenant-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetTenantId.mockResolvedValue(tenantId);
    mockUploadFile.mockResolvedValue({
      url: "https://example.com/export.csv",
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const eventRow = () => ({
    id: "evt-1",
    eventNumber: "E-001",
    title: "Gala",
    eventDate: new Date("2026-07-13T00:00:00Z"),
    guestCount: 100,
    budget: 5000,
    status: "confirmed",
    client: {
      id: "cli-1",
      companyName: "Acme",
      firstName: null,
      lastName: null,
      email: "acme@example.com",
      defaultPaymentTerms: 15,
    },
    budgets: [
      {
        lineItems: [
          {
            category: "Food",
            description: "Dinner",
            budgetedAmount: 3000,
            actualAmount: 3200,
          },
          {
            category: "Service",
            description: "Staff",
            budgetedAmount: 1000,
            actualAmount: 0,
          },
        ],
      },
    ],
  });

  const post = () =>
    POST(
      new Request("http://localhost/api/events/export/quickbooks", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never
    );

  it("should return 401 before any DB read when unauthenticated", async () => {
    mockAuth.mockResolvedValue({
      orgId: null,
      userId: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await post();

    expect(res.status).toBe(401);
    expect(mockEventFindMany).not.toHaveBeenCalled();
  });

  it("should select only the consumed event fields (no full-row over-fetch)", async () => {
    mockEventFindMany.mockResolvedValue([eventRow()] as unknown as Awaited<
      ReturnType<typeof database.event.findMany>
    >);

    const res = await post();
    const data = await res.json();

    expect(res.status).toBe(200);

    const select = selectOf(mockEventFindMany.mock.calls[0]?.[0]);
    // Exactly the consumed Event scalars + the client/budgets relations.
    expect(Object.keys(select).sort()).toEqual(
      [
        "budget",
        "budgets",
        "client",
        "eventDate",
        "eventNumber",
        "guestCount",
        "id",
        "status",
        "title",
      ].sort()
    );
    // Heavy / unused columns dropped (amplified by take:1000).
    expect(select).not.toHaveProperty("notes");
    expect(select).not.toHaveProperty("tags");
    expect(select).not.toHaveProperty("description");
    expect(select).not.toHaveProperty("venueName");

    // budgets projects only the lineItems relation (no EventBudget scalars).
    const budgetsSelect =
      (select.budgets as { select?: Record<string, unknown> })?.select ?? {};
    expect(Object.keys(budgetsSelect).sort()).toEqual(["lineItems"]);

    // lineItems narrows to the 4 consumed fields.
    const lineItemsSelect =
      (budgetsSelect.lineItems as { select?: Record<string, unknown> })
        ?.select ?? {};
    expect(Object.keys(lineItemsSelect).sort()).toEqual(
      ["actualAmount", "budgetedAmount", "category", "description"].sort()
    );

    // Export ran end-to-end over the narrowed rows.
    expect(data.eventsExported).toBe(1);
    expect(mockUploadFile).toHaveBeenCalledOnce();
  });

  it("should return 404 when no events match", async () => {
    mockEventFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof database.event.findMany>>
    );

    const res = await post();

    expect(res.status).toBe(404);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});
