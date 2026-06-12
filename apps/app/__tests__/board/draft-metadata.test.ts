import { describe, expect, it } from "vitest";
import {
  type DraftEnvelope,
  parseDraftEnvelope,
  writeDraftEnvelope,
} from "@/app/(authenticated)/events/[eventId]/board/draft-metadata";

const staffDraft: DraftEnvelope = {
  draftAction: {
    kind: "assign-staff",
    entityType: "User",
    entityId: "user-1",
    params: {
      role: "server",
      shiftStart: "2026-06-28T16:00:00.000Z",
      shiftEnd: "2026-06-28T23:00:00.000Z",
    },
  },
  draftState: "draft",
  committedRecordId: null,
};

describe("parseDraftEnvelope", () => {
  it("parses the envelope from a JSON string (manifest-written form)", () => {
    const metadata = JSON.stringify({ eventBoardDraft: staffDraft, other: 1 });
    expect(parseDraftEnvelope(metadata)).toEqual(staffDraft);
  });

  it("parses the envelope from an already-parsed object (Prisma Json form)", () => {
    expect(parseDraftEnvelope({ eventBoardDraft: staffDraft })).toEqual(
      staffDraft
    );
  });

  it("returns null when no envelope is present", () => {
    expect(parseDraftEnvelope("{}")).toBeNull();
    expect(parseDraftEnvelope({ other: 1 })).toBeNull();
    expect(parseDraftEnvelope(null)).toBeNull();
    expect(parseDraftEnvelope(undefined)).toBeNull();
  });

  it("returns null for malformed JSON or malformed envelope (never throws)", () => {
    expect(parseDraftEnvelope("not json")).toBeNull();
    expect(parseDraftEnvelope({ eventBoardDraft: { nope: true } })).toBeNull();
  });
});

describe("writeDraftEnvelope", () => {
  it("merges into existing string metadata keys instead of overwriting them", () => {
    const existing = JSON.stringify({ pinned: true });
    const out = JSON.parse(writeDraftEnvelope(existing, staffDraft));
    expect(out.pinned).toBe(true);
    expect(out.eventBoardDraft.draftState).toBe("draft");
  });

  it("merges into existing object metadata", () => {
    const out = JSON.parse(writeDraftEnvelope({ pinned: true }, staffDraft));
    expect(out.pinned).toBe(true);
    expect(out.eventBoardDraft.draftAction.entityId).toBe("user-1");
  });

  it("tolerates malformed existing metadata by starting fresh", () => {
    const out = JSON.parse(writeDraftEnvelope("not json", staffDraft));
    expect(out.eventBoardDraft.draftAction.entityId).toBe("user-1");
  });
});
