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
  const boardId = "2957779c-9732-4060-86fd-c5b2be03cbee";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses context tenantId and boardId for read_board_state when tool args omit them", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: boardId,
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
      boardId,
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
          id: boardId,
          tenantId: "tenant-1",
        }),
      })
    );
  });

  it("ignores mismatched tenantId in tool args and still uses authenticated context", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: boardId,
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
      boardId,
      correlationId: "corr-1",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: JSON.stringify({ tenantId: "wrong-tenant" }),
      callId: "call-2",
    });

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(database.commandBoard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
        }),
      })
    );
  });

  it("ignores invalid boardId in tool args and uses valid context boardId", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: boardId,
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
      boardId,
      correlationId: "corr-3",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: JSON.stringify({ boardId: "invalid board id text" }),
      callId: "call-3",
    });

    expect(result.ok).toBe(true);
    expect(database.commandBoard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: boardId,
        }),
      })
    );
  });

  it("does not require tenantId and boardId in read/detect tool schemas", () => {
    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
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

  // --- P0-4 Regression tests for known crash classes ---

  it("returns error when context boardId is not a valid UUID", async () => {
    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId: "not-a-uuid",
      correlationId: "corr-invalid-uuid",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-invalid-uuid",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("boardId is required");
    expect(result.summary).toBe("boardId is required");
  });

  it("returns error when board does not exist or tenant mismatch", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce(null);

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-not-found",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-not-found",
    });

    expect(result.ok).toBe(false);
    // Error message is sanitized - should not contain UUID
    expect(result.error).not.toContain(boardId);
    expect(result.summary).not.toContain(boardId);
    // Should contain actionable guidance
    expect(result.error).toContain("could not be found");
  });

  it("handles database errors gracefully during board lookup", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockRejectedValueOnce(
      new Error("Connection timeout")
    );

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-db-error",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-db-error",
    });

    expect(result.ok).toBe(false);
    // Database errors are sanitized - should not expose internal error
    expect(result.error).not.toContain("Connection timeout");
    expect(result.error).not.toContain("timeout");
    // Should provide safe actionable guidance
    expect(result.summary).toContain("unavailable");
  });

  it("handles database errors during projection lookup", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: boardId,
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
    vi.mocked(database.boardProjection.findMany).mockRejectedValueOnce(
      new Error("Query timeout")
    );

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-proj-error",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-proj-error",
    });

    expect(result.ok).toBe(false);
    // Database errors are sanitized - should not expose internal error
    expect(result.error).not.toContain("Query timeout");
    expect(result.error).not.toContain("timeout");
    // Should provide safe actionable guidance
    expect(result.summary).toContain("unavailable");
  });

  it("handles malformed JSON in argumentsJson gracefully", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: boardId,
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
      boardId,
      correlationId: "corr-malformed",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{ invalid json }",
      callId: "call-malformed",
    });

    // Should treat as empty args and use context boardId
    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Loaded board snapshot");
  });

  it("returns error for unknown tool names", async () => {
    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-unknown",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "nonexistent_tool",
      argumentsJson: "{}",
      callId: "call-unknown",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Unknown tool: nonexistent_tool");
    expect(result.summary).toBe("Unknown tool: nonexistent_tool");
  });

  it("returns empty projections array when board has no projections", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: boardId,
      tenantId: "tenant-1",
      eventId: null,
      name: "Empty Board",
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
      boardId,
      correlationId: "corr-empty",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-empty",
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toBe("Loaded board snapshot with 0 projections");
    expect(
      (result.data as { projectionSummary: { total: number } })
        .projectionSummary.total
    ).toBe(0);
  });
});

describe("command board chat tool registry - detect_conflicts tool", () => {
  const boardId = "2957779c-9732-4060-86fd-c5b2be03cbee";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when boardId is missing for detect_conflicts", async () => {
    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId: undefined,
      correlationId: "corr-detect-no-board",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "detect_conflicts",
      argumentsJson: "{}",
      callId: "call-detect-no-board",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("boardId is required");
  });

  it("handles API error responses from detect_conflicts", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({ code: "UNAUTHORIZED", message: "Not authenticated" }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-detect-401",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "detect_conflicts",
      argumentsJson: "{}",
      callId: "call-detect-401",
    });

    expect(result.ok).toBe(false);
    // Error message is sanitized - should not expose raw API response
    expect(result.error).not.toContain("UNAUTHORIZED");
    expect(result.error).not.toContain("401");
    // 401 → PERMISSION_DENIED message
    expect(result.summary.toLowerCase()).toContain("permission");
  });

  it("returns empty conflicts array when no conflicts detected", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          conflicts: [],
          summary: { total: 0, bySeverity: {}, byType: {} },
          analyzedAt: "2026-02-20T00:00:00.000Z",
        }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-detect-empty",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "detect_conflicts",
      argumentsJson: "{}",
      callId: "call-detect-empty",
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toBe("Detected 0 conflicts");
  });

  it("passes timeRange and entityTypes to detect_conflicts API", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          conflicts: [],
          summary: { total: 0, bySeverity: {}, byType: {} },
          analyzedAt: "2026-02-20T00:00:00.000Z",
        }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-detect-params",
      authCookie: null,
    });

    await registry.executeToolCall({
      name: "detect_conflicts",
      argumentsJson: JSON.stringify({
        timeRange: { start: "2026-02-20", end: "2026-02-21" },
        entityTypes: ["scheduling", "inventory"],
      }),
      callId: "call-detect-params",
    });

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.timeRange).toEqual({ start: "2026-02-20", end: "2026-02-21" });
    expect(body.entityTypes).toEqual(["scheduling", "inventory"]);
  });

  it("handles partial results with warnings from detect_conflicts", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          conflicts: [{ type: "scheduling", severity: "high", title: "Test" }],
          summary: {
            total: 1,
            bySeverity: { high: 1 },
            byType: { scheduling: 1 },
          },
          analyzedAt: "2026-02-20T00:00:00.000Z",
          warnings: [{ detectorType: "inventory", message: "Query failed" }],
        }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-detect-warnings",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "detect_conflicts",
      argumentsJson: "{}",
      callId: "call-detect-warnings",
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toBe("Detected 1 conflicts");
    const data = result.data as { conflicts: unknown[]; warnings?: unknown[] };
    expect(data.conflicts).toHaveLength(1);
    expect(data.warnings).toHaveLength(1);
  });

  it("resolves separator variants to canonical manifest commands", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, id: "new-card-id" }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-cmd-decorated",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "command-board-card",
        commandName: "create",
        args: { title: "Test Card" },
      }),
      callId: "call-cmd-separated",
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toBe(
      "CommandBoardCard.create executed successfully"
    );
    const data = result.data as { routePath: string };
    expect(data.routePath).toBe("/api/command-board/cards/commands/create");
  });

  it("uses context userId when not provided in args", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "context-user-123",
      boardId,
      correlationId: "corr-cmd-userid",
      authCookie: null,
    });

    await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "update",
        args: { id: "card-id", title: "Updated" },
      }),
      callId: "call-cmd-userid",
    });

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.userId).toBe("context-user-123");
  });

  it("uses provided idempotencyKey when specified", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-cmd-idem",
      authCookie: null,
    });

    await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "update",
        args: { id: "card-id" },
        idempotencyKey: "custom-idempotency-key-123",
      }),
      callId: "call-cmd-idem",
    });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers["x-idempotency-key"]).toBe(
      "custom-idempotency-key-123"
    );
  });

  it("handles non-JSON API responses gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "Not JSON response",
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-cmd-nonjson",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "create",
        args: { title: "Test" },
      }),
      callId: "call-cmd-nonjson",
    });

    expect(result.ok).toBe(true);
    const data = result.data as { response: string };
    expect(data.response).toBe("Not JSON response");
  });
});

// HTTP status → safe diagnostic message tests
describe("command board chat tool registry - HTTP error diagnostics", () => {
  const boardId = "2957779c-9732-4060-86fd-c5b2be03cbee";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 from executeManifestCommandRoute returns permission-denied message with status in data", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: "Not authenticated" }),
    });

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-401",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "create",
        args: { name: "Test Event" },
      }),
      callId: "call-401",
    });

    expect(result.ok).toBe(false);
    expect(result.summary.toLowerCase()).toContain("permission");
    const data = result.data as { status: number; errorCode: string };
    expect(data.status).toBe(401);
    expect(data.errorCode).toBe("PERMISSION_DENIED");
  });

  it("404 from executeManifestCommandRoute returns not-found message with status in data", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: "Route not found" }),
    });

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-404",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "create",
        args: { name: "Test Event" },
      }),
      callId: "call-404",
    });

    expect(result.ok).toBe(false);
    const data = result.data as {
      status: number;
      errorCode: string;
      routePath: string;
    };
    expect(data.status).toBe(404);
    expect(data.errorCode).toBe("BOARD_NOT_FOUND");
    expect(typeof data.routePath).toBe("string");
    expect(data.routePath.length).toBeGreaterThan(0);
  });

  it("422 from executeManifestCommandRoute returns invalid-request message; safe API message passes through", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ message: "boardId is required" }),
    });

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-422",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "create",
        args: { name: "Test Event" },
      }),
      callId: "call-422",
    });

    expect(result.ok).toBe(false);
    // "boardId is required" matches knownSafePatterns so it passes through
    expect(result.summary).toBe("boardId is required");
    const data = result.data as { status: number; errorCode: string };
    expect(data.status).toBe(422);
    expect(data.errorCode).toBe("INVALID_REQUEST");
  });

  it("400 with unsafe message falls back to generic invalid-request message", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      // Use an unsafe message that doesn't match dbKeywords or knownSafePatterns
      text: async () =>
        JSON.stringify({
          error: "Validation failed: field 'name' is required",
        }),
    });

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-400-unsafe",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "create",
        args: { name: "Test Event" },
      }),
      callId: "call-400-unsafe",
    });

    expect(result.ok).toBe(false);
    expect(result.summary).not.toContain("SQL");
    expect(result.summary).not.toContain("tenant_foo");
    expect(result.summary.toLowerCase()).toContain("invalid");
  });

  it("500 from executeManifestCommandRoute returns service-unavailable message", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          message: "Internal server error",
          stack: "Error at...",
        }),
    });

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-500",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "create",
        args: { name: "Test Event" },
      }),
      callId: "call-500",
    });

    expect(result.ok).toBe(false);
    expect(result.summary.toLowerCase()).toContain("unavailable");
    expect(result.summary).not.toContain("stack");
    const data = result.data as { status: number; errorCode: string };
    expect(data.status).toBe(500);
    expect(data.errorCode).toBe("SERVICE_UNAVAILABLE");
  });

  it("401 from detectConflictsTool returns permission-denied message with status in data", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: "Not authenticated" }),
    });

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-detect-401-diag",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "detect_conflicts",
      argumentsJson: "{}",
      callId: "call-detect-401-diag",
    });

    expect(result.ok).toBe(false);
    expect(result.summary.toLowerCase()).toContain("permission");
    const data = result.data as { status: number; errorCode: string };
    expect(data.status).toBe(401);
    expect(data.errorCode).toBe("PERMISSION_DENIED");
  });
});

// P1-6 Response guardrails tests
describe("command board chat tool registry - response guardrails", () => {
  const boardId = "2957779c-9732-4060-86fd-c5b2be03cbee";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never exposes tenantId in read_board_state success response", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockResolvedValueOnce({
      id: boardId,
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
      tenantId: "sensitive-tenant-id",
      userId: "user-1",
      boardId,
      correlationId: "corr-1",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-1",
    });

    expect(result.ok).toBe(true);
    // Verify tenantId is not exposed in data (we removed it from snapshot)
    const data = result.data as { tenantId?: string; board?: { id: string } };
    expect(data.tenantId).toBeUndefined();
    // Verify tenantId is not in summary
    expect(result.summary).not.toContain("sensitive-tenant-id");
  });

  it("never exposes raw database errors to users", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockRejectedValueOnce(
      new Error(
        "PrismaClientKnownRequestError: Invalid `database.commandBoard.findFirst()` invocation. Connection refused."
      )
    );

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-db-error",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-db-error",
    });

    expect(result.ok).toBe(false);
    // Should not expose Prisma/database error details
    expect(result.error).not.toContain("PrismaClient");
    expect(result.error).not.toContain("database");
    expect(result.error).not.toContain("Connection refused");
    // Should provide safe actionable guidance
    expect(result.summary).toContain("unavailable");
  });

  it("never exposes raw API error responses", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          code: "INTERNAL_ERROR",
          message: 'PostgreSQL error: relation "tenant_foo" does not exist',
          stack: "Error at line 123...",
        }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-api-error",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "detect_conflicts",
      argumentsJson: "{}",
      callId: "call-api-error",
    });

    expect(result.ok).toBe(false);
    // Should not expose raw API error details
    expect(result.error).not.toContain("PostgreSQL");
    expect(result.error).not.toContain("relation");
    expect(result.error).not.toContain("stack");
    // 500 with db keywords → SERVICE_UNAVAILABLE
    expect(result.summary.toLowerCase()).toContain("unavailable");
  });

  it("never exposes userId in execute_manifest_command responses", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "sensitive-user-id",
      boardId,
      correlationId: "corr-userid",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "create",
        args: { title: "Test" },
      }),
      callId: "call-userid",
    });

    expect(result.ok).toBe(true);
    // Summary should not contain userId
    expect(result.summary).not.toContain("sensitive-user-id");
  });

  it("always provides actionable next steps on error", async () => {
    const { database } = await import("@repo/database");

    vi.mocked(database.commandBoard.findFirst).mockRejectedValueOnce(
      new Error("Some internal error")
    );

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId,
      correlationId: "corr-actionable",
      authCookie: null,
    });

    const result = await registry.executeToolCall({
      name: "read_board_state",
      argumentsJson: "{}",
      callId: "call-actionable",
    });

    expect(result.ok).toBe(false);
    // Error message should be actionable (not just "error occurred")
    expect(result.error?.length ?? 0).toBeGreaterThan(10);
    expect(result.summary.length).toBeGreaterThan(10);
    // Should suggest some action
    const hasActionableWords =
      result.summary.toLowerCase().includes("try") ||
      result.summary.toLowerCase().includes("check") ||
      result.summary.toLowerCase().includes("unavailable") ||
      result.summary.toLowerCase().includes("not found") ||
      result.summary.toLowerCase().includes("could not");
    expect(hasActionableWords).toBe(true);
  });
});
