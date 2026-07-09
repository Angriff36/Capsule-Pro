/**
 * @vitest-environment node
 *
 * Desktop waste logging must use POST /api/kitchen/waste/entries so the
 * server fills loggedBy / unitCost / eventId / notes / unitId. Direct
 * wasteEntryCreate against the Manifest dispatcher is incomplete and fails Zod.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api";
import { logWasteEntryViaComposite } from "../../app/(authenticated)/(operations)/kitchen/waste/log-waste-entry";

const fetchMock = apiFetch as ReturnType<typeof vi.fn>;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("logWasteEntryViaComposite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs to the composite waste entries route without inventing create params", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        result: {
          id: "waste-1",
          unitCost: 2.5,
          totalCost: 5,
        },
      })
    );

    const result = await logWasteEntryViaComposite({
      inventoryItemId: "item-1",
      quantity: 2,
      reasonId: 3,
      notes: "spoiled",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.id).toBe("waste-1");
      expect(result.entry.unitCost).toBe(2.5);
      expect(result.entry.totalCost).toBe(5);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined,
    ];
    expect(path).toBe("/api/kitchen/waste/entries");
    expect(init?.method).toBe("POST");

    const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(sent).toEqual({
      inventoryItemId: "item-1",
      quantity: 2,
      reasonId: 3,
      notes: "spoiled",
    });
    expect(sent).not.toHaveProperty("loggedBy");
    expect(sent).not.toHaveProperty("unitCost");
    expect(sent).not.toHaveProperty("eventId");
    expect(sent).not.toHaveProperty("unitId");
  });

  it("surfaces server unitCost/totalCost from the persisted result", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        result: {
          id: "waste-2",
          unitCost: 4,
          totalCost: 12,
        },
      })
    );

    const result = await logWasteEntryViaComposite({
      inventoryItemId: "item-2",
      quantity: 3,
      reasonId: 1,
      unitId: 7,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.unitCost).toBe(4);
      expect(result.entry.totalCost).toBe(12);
    }

    const sent = JSON.parse(
      String((fetchMock.mock.calls[0] as [string, RequestInit])[1]?.body)
    ) as Record<string, unknown>;
    expect(sent.unitId).toBe(7);
  });

  it("does not report success when the response lacks a persisted id", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        result: { unitCost: 1, totalCost: 1 },
      })
    );

    const result = await logWasteEntryViaComposite({
      inventoryItemId: "item-3",
      quantity: 1,
      reasonId: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/persisted id/i);
    }
  });

  it("does not report success on HTTP or success:false failures", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        success: false,
        message: "Invalid parameters for WasteEntry.create",
      })
    );

    const result = await logWasteEntryViaComposite({
      inventoryItemId: "item-4",
      quantity: 1,
      reasonId: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid parameters");
    }
  });
});
