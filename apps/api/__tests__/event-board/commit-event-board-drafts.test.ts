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
        params: { role: "server", shiftStart: "2026-06-28T16:00:00.000Z", shiftEnd: "2026-06-28T23:00:00.000Z" },
      },
      draftState: "draft",
      committedRecordId: null,
    },
  },
});

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
  const calls: Array<{ entity: string; command: string; body: Record<string, unknown>; instanceId?: string }> = [];
  const deps = {
    loadDraftCards: vi.fn(async () => [draftCard("c1", "s1"), draftCard("c2", "s2")]),
    transact: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ fake: "tx" })),
    runCommand: vi.fn(async (_tx: unknown, params: (typeof calls)[number]) => {
      calls.push(params);
      return { success: true as const, instanceId: `created-${params.entity}-${calls.length}` };
    }),
    ...overrides,
  };
  return { deps, calls };
}

describe("commitEventBoardDrafts", () => {
  it("runs EventStaff.assign per draft and flips each card inside the transaction", async () => {
    const { deps, calls } = makeDeps();
    const result = await commitEventBoardDrafts(deps as never, { boardId: "b1", eventId: "e1", user: USER });
    expect(result.success).toBe(true);
    const assigns = calls.filter((c) => c.entity === "EventStaff" && c.command === "assign");
    expect(assigns).toHaveLength(2);
    expect(assigns[0].body).toMatchObject({ eventId: "e1", staffMemberId: "s1", role: "server" });
    const flips = calls.filter((c) => c.entity === "CommandBoardCard" && c.command === "update");
    expect(flips).toHaveLength(2);
    expect(flips[0].body).toMatchObject({ newTitle: "Staff s1", newStatus: "pending", newCardType: "entity" });
    const flippedMeta = JSON.parse(flips[0].body.newMetadata as string);
    expect(flippedMeta.eventBoardDraft.draftState).toBe("committed");
    expect(flippedMeta.eventBoardDraft.committedRecordId).toMatch(/^created-EventStaff/);
  });

  it("throws inside the transaction when any command fails (so everything rolls back)", async () => {
    const { deps } = makeDeps({
      runCommand: vi.fn(async (_tx: unknown, p: { entity: string }) => {
        if (p.entity === "EventStaff") return { success: false as const, error: "policy denied" };
        return { success: true as const, instanceId: "x" };
      }),
    });
    const result = await commitEventBoardDrafts(deps as never, { boardId: "b1", eventId: "e1", user: USER });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("policy denied");
  });

  it("succeeds as a no-op when there are no draft cards", async () => {
    const { deps } = makeDeps({ loadDraftCards: vi.fn(async () => []) });
    const result = await commitEventBoardDrafts(deps as never, { boardId: "b1", eventId: "e1", user: USER });
    expect(result.success).toBe(true);
    if (result.success) expect(result.committedCount).toBe(0);
  });
});
