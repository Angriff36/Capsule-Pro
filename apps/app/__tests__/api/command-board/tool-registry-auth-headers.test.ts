// @vitest-environment node
/**
 * Clerk session JWTs expire ~60s after minting. The agent loop captures the
 * request cookie ONCE and then runs multi-roundtrip model loops that routinely
 * exceed that TTL — so commands executed late in the loop 401'd at the API and
 * surfaced to users as "You do not have permission to perform this action."
 *
 * These tests pin the fix: when the route provides `getToken`, a FRESH token
 * is minted per command call and sent as an Authorization Bearer header
 * (Clerk middleware on apps/api accepts header-based session tokens), with the
 * original cookie kept only as a fallback.
 */

import { describe, expect, it, vi } from "vitest";
import { createManifestToolRegistry } from "@/app/api/command-board/chat/tool-registry";

vi.mock("@repo/database", () => ({
  database: {
    commandBoard: { findFirst: vi.fn() },
    boardProjection: { findMany: vi.fn() },
  },
}));

function mockCommandFetch() {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ ok: true }),
  });
  global.fetch = mockFetch;
  return mockFetch;
}

const CALL = {
  name: "execute_manifest_command",
  argumentsJson: JSON.stringify({
    entityName: "CommandBoardCard",
    commandName: "create",
    args: { title: "Test" },
  }),
  callId: "call-auth-1",
};

const BASE_CONTEXT = {
  tenantId: "tenant-1",
  userId: "user-1",
  boardId: "2957779c-9732-4060-86fd-c5b2be03cbee",
  correlationId: "corr-auth",
};

describe("per-call auth headers", () => {
  it("mints a fresh Bearer token per command call when getToken is provided", async () => {
    const mockFetch = mockCommandFetch();
    const getToken = vi
      .fn()
      .mockResolvedValueOnce("jwt-1")
      .mockResolvedValueOnce("jwt-2");

    const registry = createManifestToolRegistry({
      ...BASE_CONTEXT,
      authCookie: "__session=stale",
      getToken,
    });

    await registry.executeToolCall(CALL);
    await registry.executeToolCall({ ...CALL, callId: "call-auth-2" });

    const headersOf = (i: number) =>
      (mockFetch.mock.calls[i]?.[1] as { headers: Record<string, string> })
        .headers;
    expect(headersOf(0).Authorization).toBe("Bearer jwt-1");
    expect(headersOf(1).Authorization).toBe("Bearer jwt-2");
    expect(getToken).toHaveBeenCalledTimes(2);
    // Cookie still forwarded as fallback alongside the fresh token.
    expect(headersOf(0).Cookie).toBe("__session=stale");
  });

  it("falls back to the cookie when getToken is absent", async () => {
    const mockFetch = mockCommandFetch();

    const registry = createManifestToolRegistry({
      ...BASE_CONTEXT,
      authCookie: "__session=only-cookie",
    });

    await registry.executeToolCall(CALL);

    const headers = (
      mockFetch.mock.calls[0]?.[1] as { headers: Record<string, string> }
    ).headers;
    expect(headers.Authorization).toBeUndefined();
    expect(headers.Cookie).toBe("__session=only-cookie");
  });

  it("does not fail the command call when getToken rejects", async () => {
    const mockFetch = mockCommandFetch();

    const registry = createManifestToolRegistry({
      ...BASE_CONTEXT,
      authCookie: "__session=fallback",
      getToken: vi.fn().mockRejectedValue(new Error("clerk down")),
    });

    const result = await registry.executeToolCall(CALL);

    expect(result.ok).toBe(true);
    const headers = (
      mockFetch.mock.calls[0]?.[1] as { headers: Record<string, string> }
    ).headers;
    expect(headers.Authorization).toBeUndefined();
    expect(headers.Cookie).toBe("__session=fallback");
  });
});
