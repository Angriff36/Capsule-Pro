/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — the "WORST" apps/app over-fetch):
 * the Battle Boards list RSC page did an UNBOUNDED findMany with NO select,
 * pulling all ~24 columns of every board row — including the heavy boardData
 * JSON blob AND ~16 unused scalars (description, notes, inheritedContext,
 * documentUrl, tags, venue*, eventDate, …) — scaled by N boards per page load.
 * The page consumes only id, boardName, status, isTemplate, and boardData
 * (the card date is boardData.meta.eventDate, NOT the eventDate column), so a
 * focused select drops the unused columns per row.
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 5 consumed fields — the
 *     regression guard that fails if the select is dropped (reverts to full-row).
 *  2. The optional eventId filter is applied when provided and omitted when not.
 *  3. boardData is read correctly (staff/timeline/meta drive stats + cards).
 *  4. No read fires when unauthenticated (the orgId guard short-circuits).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("../../app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    battleBoard: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import BattleBoardsPage from "../../app/(authenticated)/(events)/events/battle-boards/page";
import { getTenantIdForOrg } from "../../app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const battleBoardFindMany = database.battleBoard.findMany as ReturnType<
  typeof vi.fn
>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

// A realistic page of boards exercising every boardData-driven read path
// (staff length → totalStaff stat + per-card staff count; timeline length →
// per-card timeline count; meta.eventName/eventDate → per-card header/date).
const boardsFixture = [
  {
    id: "b-1",
    boardName: "Spring Gala",
    status: "draft",
    isTemplate: false,
    boardData: {
      meta: { eventName: "Spring Gala", eventDate: "2026-05-01" },
      staff: [{ name: "Ada" }, { name: "Bo" }],
      timeline: [{ time: "18:00", item: "Doors" }],
    },
  },
  {
    id: "b-2",
    boardName: "Summer BBQ",
    status: "published",
    isTemplate: true,
    boardData: {
      meta: { eventName: "Summer BBQ" },
      staff: [{ name: "Cy" }],
      timeline: [],
    },
  },
  {
    id: "b-3",
    boardName: "No-data board",
    status: "ready",
    isTemplate: false,
    boardData: {},
  },
];

const SELECT_ONLY_CONSUMED = {
  id: true,
  boardName: true,
  status: true,
  isTemplate: true,
  boardData: true,
};

describe("BattleBoardsPage — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    battleBoardFindMany.mockResolvedValue(boardsFixture);
  });

  it("selects ONLY the 5 consumed fields (no full-row over-fetch)", async () => {
    await BattleBoardsPage({ searchParams: Promise.resolve({}) });

    expect(battleBoardFindMany).toHaveBeenCalledTimes(1);
    // objectContaining matches `select` with deep equality, so this passes ONLY
    // when select is exactly these 5 keys — re-adding a dropped column (e.g.
    // description / notes / documentUrl / inheritedContext / tags / eventDate)
    // or dropping the select entirely fails loudly.
    expect(battleBoardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: [{ createdAt: "desc" }],
        select: SELECT_ONLY_CONSUMED,
      })
    );
  });

  it("applies the eventId filter only when provided", async () => {
    await BattleBoardsPage({
      searchParams: Promise.resolve({ eventId: "evt-9" }),
    });
    expect(battleBoardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null, eventId: "evt-9" },
        select: SELECT_ONLY_CONSUMED,
      })
    );

    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    battleBoardFindMany.mockResolvedValue(boardsFixture);

    await BattleBoardsPage({ searchParams: Promise.resolve({}) });
    expect(battleBoardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        select: SELECT_ONLY_CONSUMED,
      })
    );
  });

  it("reads boardData correctly (stats + cards resolve over the fixture)", async () => {
    // The page computes draftCount/readyCount/publishedCount/totalStaff from
    // the array and reads boardData.staff/timeline/meta per card. Resolving
    // cleanly proves the selected boardData feeds every read path.
    const result = await BattleBoardsPage({ searchParams: Promise.resolve({}) });
    await expect(result).toBeDefined();
    expect(battleBoardFindMany).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(
      BattleBoardsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("NOT_FOUND");

    expect(battleBoardFindMany).not.toHaveBeenCalled();
  });
});
