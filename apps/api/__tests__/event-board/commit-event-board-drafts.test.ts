// apps/api/__tests__/event-board/commit-event-board-drafts.test.ts
import { describe, expect, it, vi } from "vitest";
import { commitEventBoardDrafts } from "../../lib/event-board/commit-event-board-drafts";

const USER = { id: "u-admin", tenantId: "t1", role: "admin" };

const draftCard = (id: string, staffId: string) => ({
  id,
  title: `Staff ${staffId}`,
  content: "",
  cardType: "entity",
  status: "pending",
  color: "#6366f1",
  groupId: "",
  // metadata as an OBJECT — the Prisma Json form (orchestrator must normalize)
  metadata: {
    eventBoardDraft: {
      draftAction: {
        kind: "assign-staff",
        entityType: "User",
        entityId: staffId,
        params: {
          role: "server",
          shiftStart: "2026-06-28T16:00:00.000Z",
          shiftEnd: "2026-06-28T23:00:00.000Z",
        },
      },
      draftState: "draft",
      committedRecordId: null,
    },
  },
});

const dishDraftCard = (id: string, dishId: string) => ({
  id,
  title: `Dish ${dishId}`,
  content: "",
  cardType: "entity",
  status: "pending",
  color: "#ec4899",
  groupId: "",
  metadata: {
    eventBoardDraft: {
      draftAction: {
        kind: "add-dish",
        entityType: "Dish",
        entityId: dishId,
        params: {
          quantityServings: "120",
          course: "Main",
          specialInstructions: "no nuts",
        },
      },
      draftState: "draft",
      committedRecordId: null,
    },
  },
});

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
  const calls: Array<{
    entity: string;
    command: string;
    body: Record<string, unknown>;
    instanceId?: string;
  }> = [];
  const deps = {
    lockBoard: vi.fn(async () => ({ eventId: "e1" })),
    loadDraftCards: vi.fn(async () => [
      draftCard("c1", "s1"),
      draftCard("c2", "s2"),
    ]),
    loadActiveStaff: vi.fn(
      async () => [] as Array<{ id: string; staffMemberId: string }>
    ),
    transact: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ fake: "tx" })
    ),
    runCommand: vi.fn(async (_tx: unknown, params: (typeof calls)[number]) => {
      calls.push(params);
      return {
        success: true as const,
        instanceId: `created-${params.entity}-${calls.length}`,
      };
    }),
    ...overrides,
  };
  return { deps, calls };
}

describe("commitEventBoardDrafts", () => {
  it("runs EventStaff.create per draft and flips each card inside the transaction", async () => {
    const { deps, calls } = makeDeps();
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    const assigns = calls.filter(
      (c) => c.entity === "EventStaff" && c.command === "create"
    );
    expect(assigns).toHaveLength(2);
    expect(assigns[0]!.body).toMatchObject({
      eventId: "e1",
      staffMemberId: "s1",
      role: "server",
      // Envelope carries ISO strings; the orchestrator must convert to epoch ms
      // (engine datetime contract — ISO strings fail E_TYPE_DATETIME).
      shiftStart: Date.parse("2026-06-28T16:00:00.000Z"),
      shiftEnd: Date.parse("2026-06-28T23:00:00.000Z"),
    });
    const flips = calls.filter(
      (c) => c.entity === "CommandBoardCard" && c.command === "update"
    );
    expect(flips).toHaveLength(2);
    expect(flips[0]!.body).toMatchObject({
      newTitle: "Staff s1",
      newStatus: "pending",
      newCardType: "entity",
    });
    const flippedMeta = JSON.parse(flips[0]!.body.newMetadata as string);
    expect(flippedMeta.eventBoardDraft.draftState).toBe("committed");
    expect(flippedMeta.eventBoardDraft.committedRecordId).toMatch(
      /^created-EventStaff/
    );
  });

  it("throws inside the transaction when any command fails (so everything rolls back)", async () => {
    const { deps } = makeDeps({
      runCommand: vi.fn(async (_tx: unknown, p: { entity: string }) => {
        if (p.entity === "EventStaff") {
          return { success: false as const, error: "policy denied" };
        }
        return { success: true as const, instanceId: "x" };
      }),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("policy denied");
    }
  });

  it("succeeds as a no-op when there are no draft cards", async () => {
    const { deps } = makeDeps({ loadDraftCards: vi.fn(async () => []) });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.committedCount).toBe(0);
    }
  });

  it("fails when the board belongs to a different event", async () => {
    const { deps, calls } = makeDeps({
      lockBoard: vi.fn(async () => ({ eventId: "other" })),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not belong");
    }
    expect(calls).toHaveLength(0);
  });

  it("normalizes string-form metadata (Prisma Json read as JSON string)", async () => {
    const card = draftCard("c1", "s1");
    const stringCard = { ...card, metadata: JSON.stringify(card.metadata) };
    const { deps, calls } = makeDeps({
      loadDraftCards: vi.fn(async () => [stringCard]),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.committedCount).toBe(1);
    }
    const flips = calls.filter(
      (c) => c.entity === "CommandBoardCard" && c.command === "update"
    );
    expect(flips).toHaveLength(1);
    const flippedMeta = JSON.parse(flips[0]!.body.newMetadata as string);
    expect(flippedMeta.eventBoardDraft.draftState).toBe("committed");
  });

  it("is idempotent: already-committed cards are skipped without any command", async () => {
    const card = draftCard("c1", "s1");
    const committedCard = {
      ...card,
      metadata: {
        eventBoardDraft: {
          ...card.metadata.eventBoardDraft,
          draftState: "committed",
          committedRecordId: "es-1",
        },
      },
    };
    const { deps } = makeDeps({
      loadDraftCards: vi.fn(async () => [committedCard]),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.committedCount).toBe(0);
    }
    expect(deps.runCommand).not.toHaveBeenCalled();
  });

  it("runs EventDish.create for add-dish drafts (quantity parsed to int)", async () => {
    const { deps, calls } = makeDeps({
      loadDraftCards: vi.fn(async () => [dishDraftCard("c9", "dish-1")]),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.committedCount).toBe(1);
    }
    const creates = calls.filter(
      (c) => c.entity === "EventDish" && c.command === "create"
    );
    expect(creates).toHaveLength(1);
    expect(creates[0]!.body).toMatchObject({
      eventId: "e1",
      dishId: "dish-1",
      // Envelope params are strings; the int command param must arrive as a number.
      quantityServings: 120,
      course: "Main",
      specialInstructions: "no nuts",
    });
    const flips = calls.filter(
      (c) => c.entity === "CommandBoardCard" && c.command === "update"
    );
    expect(flips).toHaveLength(1);
    const flippedMeta = JSON.parse(flips[0]!.body.newMetadata as string);
    expect(flippedMeta.eventBoardDraft.draftState).toBe("committed");
    expect(flippedMeta.eventBoardDraft.committedRecordId).toMatch(
      /^created-EventDish/
    );
  });

  it("fails with failedCardId on a malformed dish quantity", async () => {
    const bad = dishDraftCard("c9", "dish-1");
    bad.metadata.eventBoardDraft.draftAction.params.quantityServings = "zero";
    const { deps } = makeDeps({ loadDraftCards: vi.fn(async () => [bad]) });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid dish quantity");
      expect(result.failedCardId).toBe("c9");
    }
  });

  it("skips unknown draft kinds (no data model yet) without failing", async () => {
    const vehicle = dishDraftCard("c8", "veh-1");
    vehicle.metadata.eventBoardDraft.draftAction.kind = "assign-vehicle";
    const { deps, calls } = makeDeps({
      loadDraftCards: vi.fn(async () => [
        vehicle,
        dishDraftCard("c9", "dish-1"),
      ]),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.committedCount).toBe(1);
    }
    expect(calls.some((c) => c.entity === "EventDish")).toBe(true);
    // The unknown-kind card is untouched: no flip for it.
    const flips = calls.filter((c) => c.entity === "CommandBoardCard");
    expect(flips).toHaveLength(1);
  });

  it("skips drafts whose staff already has an active assignment and flips them to the existing row", async () => {
    const { deps, calls } = makeDeps({
      loadActiveStaff: vi.fn(async () => [
        { id: "es-existing", staffMemberId: "s1" },
      ]),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Only s2 actually committed; s1 was already assigned.
      expect(result.committedCount).toBe(1);
      expect(result.skippedDuplicates).toEqual([
        { cardId: "c1", staffMemberId: "s1", existingRecordId: "es-existing" },
      ]);
    }
    const assigns = calls.filter(
      (c) => c.entity === "EventStaff" && c.command === "create"
    );
    expect(assigns).toHaveLength(1);
    expect(assigns[0]!.body).toMatchObject({ staffMemberId: "s2" });
    // BOTH cards flip to committed — the duplicate points at the EXISTING row.
    const flips = calls.filter(
      (c) => c.entity === "CommandBoardCard" && c.command === "update"
    );
    expect(flips).toHaveLength(2);
    const dupFlip = flips.find((f) => f.instanceId === "c1");
    expect(dupFlip).toBeDefined();
    const dupMeta = JSON.parse(dupFlip?.body.newMetadata as string);
    expect(dupMeta.eventBoardDraft.draftState).toBe("committed");
    expect(dupMeta.eventBoardDraft.committedRecordId).toBe("es-existing");
  });

  it("dedupes within the batch — first draft wins, later duplicates point at the first-created row", async () => {
    const { deps, calls } = makeDeps({
      loadDraftCards: vi.fn(async () => [
        draftCard("c1", "s1"),
        draftCard("c2", "s1"),
      ]),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    const assigns = calls.filter(
      (c) => c.entity === "EventStaff" && c.command === "create"
    );
    expect(assigns).toHaveLength(1);
    const createdId = "created-EventStaff-1"; // first runCommand call in the mock
    if (result.success) {
      expect(result.committedCount).toBe(1);
      expect(result.skippedDuplicates).toEqual([
        { cardId: "c2", staffMemberId: "s1", existingRecordId: createdId },
      ]);
    }
    const flips = calls.filter(
      (c) => c.entity === "CommandBoardCard" && c.command === "update"
    );
    expect(flips).toHaveLength(2);
    const dupFlip = flips.find((f) => f.instanceId === "c2");
    const dupMeta = JSON.parse(dupFlip?.body.newMetadata as string);
    expect(dupMeta.eventBoardDraft.draftState).toBe("committed");
    expect(dupMeta.eventBoardDraft.committedRecordId).toBe(createdId);
  });

  it("reports an empty skippedDuplicates array on the normal path", async () => {
    const { deps } = makeDeps();
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.committedCount).toBe(2);
      expect(result.skippedDuplicates).toEqual([]);
    }
  });

  it("surfaces failedCardId when an EventStaff.create fails", async () => {
    const { deps } = makeDeps({
      runCommand: vi.fn(async (_tx: unknown, p: { entity: string }) => {
        if (p.entity === "EventStaff") {
          return { success: false as const, error: "policy denied" };
        }
        return { success: true as const, instanceId: "x" };
      }),
    });
    const result = await commitEventBoardDrafts(deps as never, {
      boardId: "b1",
      eventId: "e1",
      user: USER,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failedCardId).toBe("c1");
    }
  });
});
