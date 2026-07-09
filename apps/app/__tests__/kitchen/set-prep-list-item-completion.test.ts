/**
 * @vitest-environment node
 *
 * Mobile prep-item completion must use the composite complete route so the
 * server owns completedByUserId. Direct prepListItemMarkCompleted against the
 * Manifest dispatcher omits the required actor and fails Zod.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api";
import { setPrepListItemCompletionViaComposite } from "../../app/(mobile-kitchen)/kitchen/mobile/prep-lists/set-prep-list-item-completion";

const fetchMock = apiFetch as ReturnType<typeof vi.fn>;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("setPrepListItemCompletionViaComposite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs completed:true to the composite route without a client actor id", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        result: { id: "item-1", isCompleted: true, completedBy: "employee-1" },
      })
    );

    const result = await setPrepListItemCompletionViaComposite({
      prepListId: "list-1",
      itemId: "item-1",
      completed: true,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [path, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined,
    ];
    expect(path).toBe("/api/kitchen/prep-lists/list-1/items/item-1/complete");
    expect(init?.method).toBe("POST");

    const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(sent).toEqual({ completed: true });
    expect(sent).not.toHaveProperty("completedByUserId");
    expect(sent).not.toHaveProperty("userId");
    expect(sent).not.toHaveProperty("id");
  });

  it("POSTs completed:false to uncomplete without a client actor id", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        result: { id: "item-2", isCompleted: false },
      })
    );

    const result = await setPrepListItemCompletionViaComposite({
      prepListId: "list-2",
      itemId: "item-2",
      completed: false,
    });

    expect(result.ok).toBe(true);

    const sent = JSON.parse(
      String((fetchMock.mock.calls[0] as [string, RequestInit])[1]?.body)
    ) as Record<string, unknown>;
    expect(sent).toEqual({ completed: false });
    expect(sent).not.toHaveProperty("completedByUserId");
  });

  it("reports failure when the composite route rejects the request", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        success: false,
        message: "Guard 0 failed: Item is already completed",
      })
    );

    const result = await setPrepListItemCompletionViaComposite({
      prepListId: "list-3",
      itemId: "item-3",
      completed: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("already completed");
    }
  });

  it("encodes prep list and item ids in the composite path", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true }));

    await setPrepListItemCompletionViaComposite({
      prepListId: "list/with spaces",
      itemId: "item?id=1",
      completed: true,
    });

    const [path] = fetchMock.mock.calls[0] as [string];
    expect(path).toBe(
      "/api/kitchen/prep-lists/list%2Fwith%20spaces/items/item%3Fid%3D1/complete"
    );
  });
});
