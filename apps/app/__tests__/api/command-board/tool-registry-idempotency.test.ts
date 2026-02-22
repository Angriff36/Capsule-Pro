/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from "vitest";
import {
  createManifestToolRegistry,
  deterministicIdempotencyKey,
} from "@/app/api/command-board/chat/tool-registry";

vi.mock("@repo/database", () => ({
  database: {
    commandBoard: { findFirst: vi.fn() },
    boardProjection: { findMany: vi.fn() },
  },
}));

describe("deterministicIdempotencyKey", () => {
  it("produces the same key for identical inputs", () => {
    const k1 = deterministicIdempotencyKey("corr-1", "call-1", "Entity.cmd", {
      b: 2,
      a: 1,
    });
    const k2 = deterministicIdempotencyKey("corr-1", "call-1", "Entity.cmd", {
      a: 1,
      b: 2,
    });
    expect(k1).toBe(k2);
  });

  it("produces the same key for deeply nested objects with reordered keys", () => {
    const k1 = deterministicIdempotencyKey("corr-1", "call-1", "Entity.cmd", {
      outer: { z: 3, a: 1 },
      list: [1, 2],
    });
    const k2 = deterministicIdempotencyKey("corr-1", "call-1", "Entity.cmd", {
      list: [1, 2],
      outer: { a: 1, z: 3 },
    });
    expect(k1).toBe(k2);
  });

  it("produces different keys when args differ", () => {
    const k1 = deterministicIdempotencyKey("corr-1", "call-1", "Entity.cmd", {
      a: 1,
    });
    const k2 = deterministicIdempotencyKey("corr-1", "call-1", "Entity.cmd", {
      a: 2,
    });
    expect(k1).not.toBe(k2);
  });

  it("produces different keys when correlationId differs", () => {
    const args = { a: 1 };
    const k1 = deterministicIdempotencyKey(
      "corr-A",
      "call-1",
      "Entity.cmd",
      args
    );
    const k2 = deterministicIdempotencyKey(
      "corr-B",
      "call-1",
      "Entity.cmd",
      args
    );
    expect(k1).not.toBe(k2);
  });

  it("produces different keys when callId differs", () => {
    const args = { a: 1 };
    const k1 = deterministicIdempotencyKey(
      "corr-1",
      "call-A",
      "Entity.cmd",
      args
    );
    const k2 = deterministicIdempotencyKey(
      "corr-1",
      "call-B",
      "Entity.cmd",
      args
    );
    expect(k1).not.toBe(k2);
  });

  it("produces different keys when toolKey differs", () => {
    const args = { a: 1 };
    const k1 = deterministicIdempotencyKey(
      "corr-1",
      "call-1",
      "A.create",
      args
    );
    const k2 = deterministicIdempotencyKey(
      "corr-1",
      "call-1",
      "B.create",
      args
    );
    expect(k1).not.toBe(k2);
  });

  it("returns a 64-char hex string (SHA-256)", () => {
    const key = deterministicIdempotencyKey("c", "id", "t", {});
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("extracts nested args.args and ignores wrapper meta fields", () => {
    // Wrapper with args.args nested — only the semantic payload is hashed
    const withWrapper = deterministicIdempotencyKey(
      "corr-1",
      "call-1",
      "Card.create",
      {
        entityName: "Card",
        commandName: "create",
        instanceId: "inst-1",
        idempotencyKey: "ignored",
        args: { title: "Hello", priority: 1 },
      }
    );
    // Same semantic payload passed directly (flat, no meta keys)
    const flat = deterministicIdempotencyKey(
      "corr-1",
      "call-1",
      "Card.create",
      { title: "Hello", priority: 1 }
    );
    expect(withWrapper).toBe(flat);
  });

  it("strips meta keys from flat args when no args.args nesting", () => {
    const withMeta = deterministicIdempotencyKey(
      "corr-1",
      "call-1",
      "Card.create",
      {
        entityName: "Card",
        commandName: "create",
        title: "Hello",
      }
    );
    const withoutMeta = deterministicIdempotencyKey(
      "corr-1",
      "call-1",
      "Card.create",
      { title: "Hello" }
    );
    expect(withMeta).toBe(withoutMeta);
  });
});

describe("idempotency key integration via executeToolCall", () => {
  it("sends a deterministic fallback key when no explicit idempotencyKey is provided", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    global.fetch = mockFetch;

    const registry = createManifestToolRegistry({
      tenantId: "tenant-1",
      userId: "user-1",
      boardId: "2957779c-9732-4060-86fd-c5b2be03cbee",
      correlationId: "corr-det",
      authCookie: null,
    });

    await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "create",
        args: { title: "Test" },
      }),
      callId: "call-det-1",
    });

    const firstKey = (
      mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
    ).headers["x-idempotency-key"];

    // Reset and replay with identical inputs
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });

    await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "create",
        args: { title: "Test" },
      }),
      callId: "call-det-1",
    });

    const secondKey = (
      mockFetch.mock.calls[1][1] as { headers: Record<string, string> }
    ).headers["x-idempotency-key"];

    expect(firstKey).toBe(secondKey);
    expect(firstKey).toMatch(/^[0-9a-f]{64}$/);
  });
});
