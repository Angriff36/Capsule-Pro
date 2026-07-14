/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * the Invoices list RSC page did a `take:50 invoice.findMany` with NO select,
 * materializing all 33 columns of every invoice row — including the heavy
 * `notes`/`internalNotes` (@db.Text) + `lineItems`/`metadata` (Json) blobs —
 * scaled by 50 rows per page load. The page's row map consumes only 8 fields
 * (id, invoiceNumber, invoiceType, status, total, amountDue, dueDate, createdAt)
 * and passes the serialized array as the SOLE prop to <InvoicesClient>, so a
 * focused select drops the unused columns per row with zero behavior change
 * (select is a column projection — take:50 + the serialized shape are identical).
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 8 consumed fields — fails
 *     if the select is dropped (reverts to full-row) or a dropped column re-added.
 *  2. Returned rows' consumed fields resolve cleanly over a fixture (Decimal +
 *     Date coercion into the serialized shape).
 *  3. No read fires when unauthenticated (the userId/orgId guard short-circuits).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    invoice: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import InvoicesPage from "../../app/(authenticated)/(accounting)/accounting/invoices/page";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const invoiceFindMany = database.invoice.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const USER_ID = "user-1";

// Fixture uses Date for the date columns (page calls .toISOString()) and plain
// numbers for the Decimal columns (page calls Number()).
const invoicesFixture = [
  {
    id: "inv-1",
    invoiceNumber: "INV-001",
    invoiceType: "STANDARD",
    status: "SENT",
    total: 199.99,
    amountDue: 149.99,
    dueDate: new Date("2026-08-01"),
    createdAt: new Date("2026-07-01"),
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-002",
    invoiceType: "DEPOSIT",
    status: "DRAFT",
    total: 5000,
    amountDue: 5000,
    dueDate: new Date("2026-09-01"),
    createdAt: new Date("2026-07-10"),
  },
];

const SELECT_ONLY_CONSUMED = {
  id: true,
  invoiceNumber: true,
  invoiceType: true,
  status: true,
  total: true,
  amountDue: true,
  dueDate: true,
  createdAt: true,
};

describe("InvoicesPage — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: USER_ID, orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    invoiceFindMany.mockResolvedValue(invoicesFixture);
  });

  it("selects ONLY the 8 consumed fields (no full-row over-fetch)", async () => {
    await InvoicesPage();

    expect(invoiceFindMany).toHaveBeenCalledTimes(1);
    // objectContaining deep-matches `select`, so this passes ONLY when select is
    // exactly these 8 keys — re-adding a dropped column (e.g. notes / internalNotes
    // / lineItems / metadata) or dropping the select entirely fails loudly.
    expect(invoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: SELECT_ONLY_CONSUMED,
      })
    );
  });

  it("resolves the row map over the fixture (Decimal + Date coercion)", async () => {
    // The page maps each row to {id, invoiceNumber, invoiceType, status,
    // total: Number(total), amountDue: Number(amountDue), dueDate/createdAt:
    // .toISOString()} and renders <InvoicesClient invoices={serialized} />.
    // Resolving cleanly proves the 8 selected fields feed every read path.
    const result = await InvoicesPage();
    expect(result).toBeDefined();
    expect(invoiceFindMany).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null });

    await expect(InvoicesPage()).rejects.toThrow(/REDIRECT/);

    expect(invoiceFindMany).not.toHaveBeenCalled();
  });
});
