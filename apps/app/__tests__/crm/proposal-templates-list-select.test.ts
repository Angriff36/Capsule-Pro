/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * `getProposalTemplates` did an unbounded `proposalTemplate.findMany` with NO
 * select, materializing all 19 columns of every template row — including the
 * heavy `defaultTerms` @db.Text blob, a Decimal (`defaultTaxRate`), and 5
 * branding strings — scaled by N templates per templates-list page load AND per
 * proposal-form dropdown mount. The two live consumers read only 7 fields
 * (templates/page.tsx: id, name, description, eventType, isActive, isDefault,
 * defaultLineItems[.length]; proposal-form.tsx: id, name, eventType, isDefault),
 * so a focused select drops the 12 unused columns per row.
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 7 consumed fields — the
 *     regression guard that fails if the select is dropped (reverts to full-row)
 *     or a dropped column is re-added (e.g. defaultTerms / defaultTaxRate).
 *  2. The search / eventType / isActive filters are still applied WITH the select.
 *  3. The returned rows resolve cleanly over a fixture (consumed fields readable).
 *  4. requireCurrentUser gates the read (unauthenticated → throw, no DB read).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/lib/decimal", () => ({
  serializeDecimals: (x: unknown) => x,
}));
vi.mock("@/app/lib/invariant", () => ({
  invariant: (cond: unknown, msg?: string) => {
    if (!cond) {
      throw new Error(msg ?? "invariant failed");
    }
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    proposalTemplate: { findMany: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { requireCurrentUser } from "@/app/lib/tenant";
import { getProposalTemplates } from "../../app/(authenticated)/(sales)/crm/proposals/templates/actions";

const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const findMany = database.proposalTemplate.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";

// A realistic page of templates exercising every consumed read path:
// description/eventType nullable edges, isActive/isDefault both states,
// defaultLineItems with items / empty / null.
const templatesFixture = [
  {
    id: "tpl-1",
    name: "Wedding Standard",
    description: "Full-service wedding package",
    eventType: "wedding",
    isActive: true,
    isDefault: true,
    defaultLineItems: [{}, {}],
  },
  {
    id: "tpl-2",
    name: "Corporate Quick",
    description: null,
    eventType: null,
    isActive: false,
    isDefault: false,
    defaultLineItems: [],
  },
  {
    id: "tpl-3",
    name: "Legacy",
    description: "Imported template",
    eventType: "gala",
    isActive: true,
    isDefault: false,
    defaultLineItems: null,
  },
];

const SELECT_ONLY_CONSUMED = {
  id: true,
  name: true,
  description: true,
  eventType: true,
  isActive: true,
  isDefault: true,
  defaultLineItems: true,
};

describe("getProposalTemplates — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: "u-1",
      tenantId: TENANT_ID,
      role: "ADMIN",
    });
    findMany.mockResolvedValue(templatesFixture);
  });

  it("selects ONLY the 7 consumed fields (no full-row over-fetch)", async () => {
    await getProposalTemplates();

    expect(findMany).toHaveBeenCalledTimes(1);
    // objectContaining deep-equals `select`, so this passes ONLY when select is
    // exactly these 7 keys — re-adding a dropped column (defaultTerms /
    // defaultTaxRate / logoUrl / primaryColor / …) or dropping the select fails.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        select: SELECT_ONLY_CONSUMED,
      })
    );
    // The tenant scoping the action builds must also be present.
    const call = findMany.mock.calls[0]?.[0] as { where: { AND: unknown[] } };
    expect(call.where.AND).toEqual(
      expect.arrayContaining([{ tenantId: TENANT_ID }, { deletedAt: null }])
    );
  });

  it("applies search / eventType / isActive filters alongside the select", async () => {
    await getProposalTemplates({
      search: "WEDD",
      eventType: "wedding",
      isActive: true,
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: SELECT_ONLY_CONSUMED,
      })
    );
    const call = findMany.mock.calls[0]?.[0] as { where: { AND: unknown[] } };
    // search → case-insensitive name/description contains (input is lowercased)
    expect(call.where.AND).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { name: { contains: "wedd", mode: "insensitive" } },
            { description: { contains: "wedd", mode: "insensitive" } },
          ],
        },
        { eventType: "wedding" },
        { isActive: true },
      ])
    );
  });

  it("returns rows whose consumed fields resolve cleanly over the fixture", async () => {
    const rows = await getProposalTemplates();

    expect(rows).toHaveLength(3);
    // The list page reads name/description/eventType/isActive/isDefault and
    // `(defaultLineItems as unknown[]).length`; the form reads id/name/eventType/isDefault.
    expect(rows[0]?.name).toBe("Wedding Standard");
    expect(rows[0]?.isDefault).toBe(true);
    expect((rows[0]?.defaultLineItems as unknown[] | undefined)?.length).toBe(
      2
    );
    expect(rows[1]?.eventType).toBeNull();
    expect(
      (rows[1]?.defaultLineItems as unknown[] | undefined)?.length ?? 0
    ).toBe(0);
  });

  it("does not read the DB when requireCurrentUser throws", async () => {
    requireUser.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(getProposalTemplates()).rejects.toThrow("UNAUTHORIZED");
    expect(findMany).not.toHaveBeenCalled();
  });
});
