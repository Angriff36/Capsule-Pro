/**
 * @vitest-environment node
 *
 * simulations/merge POST — write-batching regression guard (DB-perf plan #25:
 * collapse the serial per-row loops in mergeSimulationToSource's $transaction
 * into one concurrent write wave).
 *
 * The merge handler applied adds/removes/modifications across projections,
 * groups, and annotations as N serial `tx.*.create`/`update` calls inside the
 * transaction — one DB round-trip per row (100+ for a 20-projection board).
 * Batching bulk add/remove into createMany/updateMany (one query each) and the
 * per-row modifications into one Promise.all turns the whole body into a single
 * concurrent wave.
 *
 * This test pins both the consolidation (each bulk group = exactly one tx call)
 * and the concurrency (writes overlap, not serial): a regression back to serial
 * loops drops maxInFlight to 1 and re-introduces N per-row create calls.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const SIMULATION_ID = "sim_123";
const SOURCE_BOARD_ID = "board_src";
const TENANT_ID = "67a4af48-114e-4e45-89d7-6ae36da6ff71";
const ORG_ID = "org_123";

// Concurrency + call-count tracking on the transaction-scoped writes.
// vi.hoisted so the vi.mock factory (hoisted above imports) can close over
// stable, pre-created mock references — same pattern as simulations.test.ts.
const { txWrites, tracker, resetConcurrency } = vi.hoisted(() => {
  const tracker = { maxInFlight: 0 };
  let inFlight = 0;
  const resetConcurrency = () => {
    tracker.maxInFlight = 0;
    inFlight = 0;
  };
  const makeWrite = () =>
    vi.fn(async (..._args: unknown[]) => {
      inFlight += 1;
      if (inFlight > tracker.maxInFlight) {
        tracker.maxInFlight = inFlight;
      }
      await new Promise((r) => setTimeout(r, 0));
      inFlight -= 1;
      return { count: 0 };
    });
  const txWrites = {
    boardProjectionUpdateMany: makeWrite(),
    boardProjectionCreateMany: makeWrite(),
    boardProjectionUpdate: makeWrite(),
    commandBoardGroupCreateMany: makeWrite(),
    commandBoardGroupUpdateMany: makeWrite(),
    boardAnnotationCreateMany: makeWrite(),
    boardAnnotationUpdateMany: makeWrite(),
    commandBoardUpdate: makeWrite(),
  };
  return { txWrites, tracker, resetConcurrency };
});

vi.mock("@repo/database", () => ({
  database: {
    commandBoard: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        boardProjection: {
          updateMany: txWrites.boardProjectionUpdateMany,
          createMany: txWrites.boardProjectionCreateMany,
          update: txWrites.boardProjectionUpdate,
        },
        commandBoardGroup: {
          createMany: txWrites.commandBoardGroupCreateMany,
          updateMany: txWrites.commandBoardGroupUpdateMany,
        },
        boardAnnotation: {
          createMany: txWrites.boardAnnotationCreateMany,
          updateMany: txWrites.boardAnnotationUpdateMany,
        },
        commandBoard: { update: txWrites.commandBoardUpdate },
      })
    ),
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@repo/database");

import { POST } from "@/app/api/command-board/simulations/merge/route";

const mockAuth = vi.mocked(auth);
const mockGetTenantIdForOrg = vi.mocked(getTenantIdForOrg);
const mockFindUnique = vi.mocked(database.commandBoard.findUnique);

// A sim projection that exists in source with a differing positionX → modified.
// Plus a sim-only projection → added, and a source-only projection → removed.
const simBoard = {
  id: SIMULATION_ID,
  tenantId: TENANT_ID,
  tags: ["simulation", `source:${SOURCE_BOARD_ID}`],
  createdAt: new Date("2026-01-01"),
  status: "draft",
  boardProjections: [
    {
      id: "sim-add",
      entityId: "ent-add",
      entityType: "EVENT",
      positionX: 5,
      positionY: 6,
      width: 10,
      height: 10,
      zIndex: 1,
      colorOverride: null,
      collapsed: false,
      groupId: null,
      pinned: false,
    },
    {
      id: "sim-mod",
      entityId: "ent-mod",
      entityType: "EVENT",
      positionX: 999,
      positionY: 7,
      width: 10,
      height: 10,
      zIndex: 1,
      colorOverride: null,
      collapsed: false,
      groupId: null,
      pinned: false,
    },
  ],
  commandBoardGroups: [
    {
      id: "grp-add",
      name: "G",
      color: null,
      collapsed: false,
      positionX: 0,
      positionY: 0,
      width: 100,
      height: 100,
      zIndex: 1,
    },
  ],
  boardAnnotations: [
    {
      id: "ann-add",
      annotationType: "LINK",
      fromProjectionId: null,
      toProjectionId: null,
      label: "L",
      color: null,
      style: null,
    },
  ],
};

const sourceBoard = {
  id: SOURCE_BOARD_ID,
  tenantId: TENANT_ID,
  boardProjections: [
    {
      id: "src-mod",
      entityId: "ent-mod",
      entityType: "EVENT",
      positionX: 0,
      positionY: 7,
      width: 10,
      height: 10,
      zIndex: 1,
      colorOverride: null,
      collapsed: false,
      groupId: null,
      pinned: false,
    },
    {
      id: "src-rm",
      entityId: "ent-rm",
      entityType: "EVENT",
      positionX: 1,
      positionY: 1,
      width: 10,
      height: 10,
      zIndex: 1,
      colorOverride: null,
      collapsed: false,
      groupId: null,
      pinned: false,
    },
  ],
  commandBoardGroups: [],
  boardAnnotations: [],
};

function makeRequest() {
  return new Request("http://localhost/api/command-board/simulations/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      simulationId: SIMULATION_ID,
      options: { applyRemovals: true, forceConflicts: true },
    }),
  });
}

describe("POST /api/command-board/simulations/merge — write batching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConcurrency();
    mockAuth.mockResolvedValue({ orgId: ORG_ID } as never);
    mockGetTenantIdForOrg.mockResolvedValue(TENANT_ID);
    // detect + merge each fetch sim then source; return the matching board.
    mockFindUnique.mockImplementation(((args: {
      where: { tenantId_id: { id: string } };
    }) => {
      const id = args.where.tenantId_id.id;
      return Promise.resolve(
        id === SIMULATION_ID
          ? (simBoard as never)
          : id === SOURCE_BOARD_ID
            ? (sourceBoard as never)
            : (null as never)
      );
    }) as never);
  });

  it("collapses the merge into one concurrent wave with correct counts", async () => {
    const response = await POST(makeRequest() as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    // Correctness: same diff as the serial implementation.
    expect(data.mergedChanges).toEqual({
      projectionsAdded: 1,
      projectionsRemoved: 1,
      projectionsModified: 1,
      groupsAdded: 1,
      groupsRemoved: 0,
      annotationsAdded: 1,
      annotationsRemoved: 0,
    });

    // Consolidation: each bulk add/remove group is ONE tx call, not N per-row
    // writes. A serial `for … tx.create` regression re-introduces per-row calls.
    expect(txWrites.boardProjectionUpdateMany).toHaveBeenCalledTimes(1);
    expect(txWrites.boardProjectionCreateMany).toHaveBeenCalledTimes(1);
    expect(txWrites.boardProjectionUpdate).toHaveBeenCalledTimes(1);
    expect(txWrites.commandBoardGroupCreateMany).toHaveBeenCalledTimes(1);
    expect(txWrites.commandBoardGroupUpdateMany).not.toHaveBeenCalled();
    expect(txWrites.boardAnnotationCreateMany).toHaveBeenCalledTimes(1);
    expect(txWrites.boardAnnotationUpdateMany).not.toHaveBeenCalled();
    expect(txWrites.commandBoardUpdate).toHaveBeenCalledTimes(2);

    // Concurrency: the wave had multiple writes in flight at once. A reverted
    // serial implementation keeps maxInFlight at 1.
    expect(tracker.maxInFlight).toBeGreaterThanOrEqual(2);

    // Correctness of the per-row modification: targets the source row + the
    // changed simulated field value.
    expect(txWrites.boardProjectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_id: { tenantId: TENANT_ID, id: "src-mod" } },
        data: expect.objectContaining({ positionX: 999 }),
      })
    );
    // Removed projection soft-delete targets the source-only row by id.
    expect(txWrites.boardProjectionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["src-rm"] },
          tenantId: TENANT_ID,
          boardId: SOURCE_BOARD_ID,
        },
        data: { deletedAt: expect.any(Date) },
      })
    );
    // Added projection is created on the source board with its entityId.
    expect(txWrites.boardProjectionCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            entityId: "ent-add",
            boardId: SOURCE_BOARD_ID,
          }),
        ],
      })
    );
  });
});
