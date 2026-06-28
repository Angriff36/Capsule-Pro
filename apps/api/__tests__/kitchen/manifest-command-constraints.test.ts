/**
 * Manifest Command-Level Constraint Tests (HTTP Level)
 *
 * Tests command-level constraints for kitchen entities through the unified dispatcher.
 * Uses mock runManifestCommand to simulate constraint outcomes.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) =>
      new Response(
        JSON.stringify({
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        }),
        { status }
      )
  ),
  manifestErrorResponse: vi.fn((message, status = 400) => {
    const body =
      typeof message === "string"
        ? { success: false, message }
        : {
            success: false,
            error: message.error,
            diagnostics: message.diagnostics ?? [],
          };
    return new Response(JSON.stringify(body), { status });
  }),
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    override name = "InvariantError" as const;
    constructor(m: string) {
      super(m);
      this.name = "InvariantError";
    }
  }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { manifestSuccessResponse } from "@/lib/manifest-response";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const mockCurrentUser = {
  id: "test-user-id",
  tenantId: "test-tenant",
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(
    "http://localhost/api/manifest/[entity]/commands/[command]",
    { method: "POST", body: JSON.stringify(body) }
  );
}

describe("Manifest Command Constraints - PrepTask Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  describe("claim - warnOverdueClaim", () => {
    it("should warn when claiming an overdue task", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-overdue-001", status: "in_progress" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "claim"
      )(
        makeRequest({
          id: "task-overdue-001",
          userId: "test-user-id",
          stationId: "station-a",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data.result).toBeDefined();
    });

    it("should succeed without warning when claiming non-overdue task", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-normal-001", status: "in_progress" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "claim"
      )(
        makeRequest({
          id: "task-normal-001",
          userId: "test-user-id",
          stationId: "station-a",
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("complete - warnIncomplete", () => {
    it("should warn when completing with remaining quantity", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "task-incomplete-001",
            status: "done",
            quantityCompleted: 5,
          },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "complete"
      )(
        makeRequest({
          id: "task-incomplete-001",
          quantityCompleted: 5,
          userId: "test-user-id",
        })
      );
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when completing full quantity", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "task-complete-001",
            status: "done",
            quantityCompleted: 10,
          },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "complete"
      )(
        makeRequest({
          id: "task-complete-001",
          quantityCompleted: 10,
          userId: "test-user-id",
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("reassign - warnReassignInProgress", () => {
    it("should warn when reassigning in-progress task", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-reassign-001", claimedBy: "user-002" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "reassign"
      )(
        makeRequest({
          id: "task-reassign-001",
          newUserId: "user-002",
          requestedBy: "manager-001",
        })
      );
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when reassigning open task", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-reassign-open-001", claimedBy: "user-002" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "reassign"
      )(
        makeRequest({
          id: "task-reassign-open-001",
          newUserId: "user-002",
          requestedBy: "manager-001",
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("update-quantity - warnQuantityDecrease", () => {
    it("should warn when decreasing total quantity", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-quantity-001", quantityTotal: 5 },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "update-quantity"
      )(
        makeRequest({
          id: "task-quantity-001",
          quantityTotal: 5,
          quantityCompleted: 0,
        })
      );
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when increasing quantity", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-quantity-inc-001", quantityTotal: 15 },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "update-quantity"
      )(
        makeRequest({
          id: "task-quantity-inc-001",
          quantityTotal: 15,
          quantityCompleted: 0,
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("cancel - warnCancelInProgress", () => {
    it("should warn when canceling in-progress task", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-cancel-001", status: "canceled" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "cancel"
      )(
        makeRequest({
          id: "task-cancel-001",
          reason: "Event cancelled",
          canceledBy: "manager-001",
        })
      );
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when canceling open task", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "task-cancel-open-001", status: "canceled" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepTask",
        "cancel"
      )(
        makeRequest({
          id: "task-cancel-open-001",
          reason: "No longer needed",
          canceledBy: "manager-001",
        })
      );
      expect(response.status).toBe(200);
    });
  });
});

describe("Manifest Command Constraints - Recipe Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  describe("update - warnNameChange", () => {
    it("should warn when renaming recipe", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "recipe-001", name: "New Recipe Name" },
          events: [],
        })
      );
      const response = await dispatch(
        "Recipe",
        "update"
      )(makeRequest({ id: "recipe-001", name: "New Recipe Name" }));
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when keeping same name", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "recipe-same-001", name: "Same Recipe Name" },
          events: [],
        })
      );
      const response = await dispatch(
        "Recipe",
        "update"
      )(makeRequest({ id: "recipe-same-001", name: "Same Recipe Name" }));
      expect(response.status).toBe(200);
    });
  });
});

describe("Manifest Command Constraints - Dish Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  describe("update-pricing - warnPriceDecrease", () => {
    it("should warn when decreasing price", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "dish-001", pricePerPerson: 1500, costPerPerson: 800 },
          events: [],
        })
      );
      const response = await dispatch(
        "Dish",
        "update-pricing"
      )(makeRequest({ id: "dish-001", newPrice: 1500, newCost: 800 }));
      expect(response.status).toBe(200);
    });
  });

  describe("update-pricing - warnMarginBelowThreshold", () => {
    it("should warn when margin is below threshold", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "dish-low-001",
            pricePerPerson: 2000,
            costPerPerson: 1600,
          },
          events: [],
        })
      );
      const response = await dispatch(
        "Dish",
        "update-pricing"
      )(makeRequest({ id: "dish-low-001", newPrice: 2000, newCost: 1600 }));
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when margin is healthy", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "dish-healthy-001",
            pricePerPerson: 2000,
            costPerPerson: 1000,
          },
          events: [],
        })
      );
      const response = await dispatch(
        "Dish",
        "update-pricing"
      )(makeRequest({ id: "dish-healthy-001", newPrice: 2000, newCost: 1000 }));
      expect(response.status).toBe(200);
    });
  });
});

describe("Manifest Command Constraints - Menu Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  describe("update - warnPriceDecrease", () => {
    it("should warn when decreasing price per person", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "menu-001", pricePerPerson: 4000 },
          events: [],
        })
      );
      const response = await dispatch(
        "Menu",
        "update"
      )(
        makeRequest({
          id: "menu-001",
          name: "Test Menu",
          newPricePerPerson: 4000,
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("update - warnGuestRangeIncrease", () => {
    it("should warn when increasing max guests by 50%+", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "menu-guests-001", maxGuests: 200 },
          events: [],
        })
      );
      const response = await dispatch(
        "Menu",
        "update"
      )(
        makeRequest({
          id: "menu-guests-001",
          name: "Guest Range Menu",
          newMaxGuests: 200,
        })
      );
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when increasing by less than 50%", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "menu-guests-small-001", maxGuests: 120 },
          events: [],
        })
      );
      const response = await dispatch(
        "Menu",
        "update"
      )(
        makeRequest({
          id: "menu-guests-small-001",
          name: "Small Increase",
          newMaxGuests: 120,
        })
      );
      expect(response.status).toBe(200);
    });
  });
});

describe("Manifest Command Constraints - PrepList Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  describe("update - warnNameChange", () => {
    it("should warn when renaming prep list", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "prep-list-001", name: "New Prep List Name" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepList",
        "update"
      )(makeRequest({ id: "prep-list-001", newName: "New Prep List Name" }));
      expect(response.status).toBe(200);
    });
  });

  describe("update-batch-multiplier - warnLargeMultiplierIncrease", () => {
    it("should warn when batch multiplier doubles or more", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "prep-list-mult-001", batchMultiplier: 5 },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepList",
        "update-batch-multiplier"
      )(makeRequest({ id: "prep-list-mult-001", newMultiplier: 5 }));
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when increasing by less than double", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "prep-list-mult-small-001", batchMultiplier: 3 },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepList",
        "update-batch-multiplier"
      )(makeRequest({ id: "prep-list-mult-small-001", newMultiplier: 3 }));
      expect(response.status).toBe(200);
    });
  });
});

describe("Manifest Command Constraints - PrepListItem Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  describe("update-station - warnStationChange", () => {
    it("should warn when changing station", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "item-001",
            stationId: "station-002",
            stationName: "Cold Prep Station",
          },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepListItem",
        "update-station"
      )(
        makeRequest({
          id: "item-001",
          newStationId: "station-002",
          newStationName: "Cold Prep Station",
        })
      );
      expect(response.status).toBe(200);
    });

    it("should succeed without warning when keeping same station", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "item-same-001",
            stationId: "station-001",
            stationName: "Hot Prep Station",
          },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepListItem",
        "update-station"
      )(
        makeRequest({
          id: "item-same-001",
          newStationId: "station-001",
          newStationName: "Hot Prep Station",
        })
      );
      expect(response.status).toBe(200);
    });
  });
});
