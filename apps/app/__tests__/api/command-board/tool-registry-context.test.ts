/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createManifestToolRegistry } from "@/app/api/command-board/chat/tool-registry";

vi.mock("@repo/database", () => ({
  database: {
    commandBoard: {
      findFirst: vi.fn(),
    },
    boardProjection: {
      findMany: vi.fn(),
    },
  },
}));

describe("command board chat tool registry context defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses context tenantId and boardId for read_board_state when tool args omit them", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: "board-1",
      tenantId: "tenant-1",
      eventId: null,
      name: "Ops Board",
      description: null,
      status: "active",
      isTemplate: false,
      scope: null,
      autoPopulate: false,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      deletedAt: null,
      tags: [],
    });
    vi.mocked(database.boardProjection.findMany).mockResolvedValueOnce([]);

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId: "board-1",
      correlationId: "corr-1",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-1",
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Loaded board snapshot");
    expect(database.commandBoard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "board-1",
          tenantId: "tenant-1",
        }),
      })
    );
  });

  it("does not require tenantId and boardId in read/detect tool schemas", () => {
    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId: "board-1",
      correlationId: "corr-2",
      authCookie: null,
    });

    const readBoard = registry.definitions.find(
      (definition) => definition.name === "read_board_state"
    );
    const detectConflicts = registry.definitions.find(
      (definition) => definition.name === "detect_conflicts"
    );

    expect(readBoard).toBeDefined();
    expect(detectConflicts).toBeDefined();
    expect(readBoard?.parameters.required).toEqual([]);
    expect(detectConflicts?.parameters.required).toEqual([]);
  });
});
