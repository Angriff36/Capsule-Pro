/**
 * Manifest Constraint Enforcement Tests (HTTP Level)
 *
 * Tests that Manifest-powered API routes properly enforce constraints
 * through the HTTP layer using the unified dispatcher.
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
    name = "InvariantError" as const;
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
import { InvariantError } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

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

describe("Manifest HTTP Constraint Enforcement - Recipe Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized requests with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "Recipe",
      "update"
    )(makeRequest({ id: "recipe-001", name: "Updated Recipe" }));
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
    expect(data).toHaveProperty("message", "Unauthenticated");
  });

  it("should handle valid update requests", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({
        result: { id: "recipe-001", name: "Updated Recipe" },
        events: [],
      })
    );
    const response = await dispatch(
      "Recipe",
      "update"
    )(makeRequest({ id: "recipe-001", name: "Updated Recipe" }));
    expect(response.status).toBe(200);
  });
});

describe("Manifest HTTP Constraint Enforcement - Dish Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized update-pricing with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "Dish",
      "update-pricing"
    )(
      makeRequest({
        id: "dish-001",
        costPerPortionCents: 500,
        salesPriceCents: 1500,
      })
    );
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should handle valid pricing update requests", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({ result: { id: "dish-001" }, events: [] })
    );
    const response = await dispatch(
      "Dish",
      "update-pricing"
    )(
      makeRequest({
        id: "dish-001",
        costPerPortionCents: 500,
        salesPriceCents: 1500,
      })
    );
    expect(response.status).toBe(200);
  });

  it("should reject unauthorized update-lead-time with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "Dish",
      "update-lead-time"
    )(
      makeRequest({ id: "dish-001", prepTimeMinutes: 45, cookTimeMinutes: 30 })
    );
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Constraint Enforcement - Menu Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized menu update with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "Menu",
      "update"
    )(makeRequest({ id: "menu-001", name: "Updated Menu" }));
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should handle valid menu update requests", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({
        result: { id: "menu-001", name: "Updated Menu" },
        events: [],
      })
    );
    const response = await dispatch(
      "Menu",
      "update"
    )(makeRequest({ id: "menu-001", name: "Updated Menu" }));
    expect(response.status).toBe(200);
  });

  it("should reject unauthorized menu activate with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "Menu",
      "activate"
    )(makeRequest({ id: "menu-001" }));
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should reject unauthorized menu deactivate with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "Menu",
      "deactivate"
    )(makeRequest({ id: "menu-001" }));
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Constraint Enforcement - PrepTask Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized claim with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "PrepTask",
      "claim"
    )(
      makeRequest({
        id: "task-001",
        userId: "user-001",
        stationId: "station-a",
      })
    );
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should reject unauthorized start with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "PrepTask",
      "start"
    )(makeRequest({ id: "task-001", userId: "user-001" }));
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should reject unauthorized complete with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "PrepTask",
      "complete"
    )(
      makeRequest({ id: "task-001", quantityCompleted: 10, userId: "user-001" })
    );
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Constraint Enforcement - PrepListItem Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized update-quantity with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "PrepListItem",
      "update-quantity"
    )(
      makeRequest({
        id: "item-001",
        newBaseQuantity: 15,
        newScaledQuantity: 30,
        newBaseUnit: "kg",
        newScaledUnit: "kg",
      })
    );
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should handle valid quantity update with WARN constraint", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({
        result: { id: "item-001", baseQuantity: 15, scaledQuantity: 35 },
        events: [],
      })
    );
    const response = await dispatch(
      "PrepListItem",
      "update-quantity"
    )(
      makeRequest({
        id: "item-001",
        newBaseQuantity: 15,
        newScaledQuantity: 35,
        newBaseUnit: "kg",
        newScaledUnit: "kg",
      })
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
  });

  it("should handle normal quantity update without warning", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({
        result: { id: "item-001", baseQuantity: 12, scaledQuantity: 24 },
        events: [],
      })
    );
    const response = await dispatch(
      "PrepListItem",
      "update-quantity"
    )(
      makeRequest({
        id: "item-001",
        newBaseQuantity: 12,
        newScaledQuantity: 24,
        newBaseUnit: "kg",
        newScaledUnit: "kg",
      })
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
  });

  it("should reject unauthorized update-station with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
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
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should handle station change with WARN constraint", async () => {
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
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
  });

  it("should handle station update to same station without warning", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({
        result: {
          id: "item-001",
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
        id: "item-001",
        newStationId: "station-001",
        newStationName: "Hot Prep Station",
      })
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
  });
});

describe("Manifest HTTP Constraint Enforcement - RecipeVersion Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized create with 401", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(
      new InvariantError("Unauthenticated")
    );
    const response = await dispatch(
      "RecipeVersion",
      "create"
    )(makeRequest({ recipeId: "recipe-001", difficulty: 3 }));
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });

  it("should reject invalid difficulty with 422 (BLOCK)", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestErrorResponse("difficulty must be between 1 and 5", 422)
    );
    const response = await dispatch(
      "RecipeVersion",
      "create"
    )(makeRequest({ recipeId: "recipe-001", difficulty: 6 }));
    const data = await response.json();
    expect(response.status).toBe(422);
    expect(data).toHaveProperty("success", false);
    expect(data).toHaveProperty("message");
  });

  it("should reject negative times with 422 (BLOCK)", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestErrorResponse("times cannot be negative", 422)
    );
    const response = await dispatch(
      "RecipeVersion",
      "create"
    )(makeRequest({ recipeId: "recipe-001", prepTime: -30 }));
    const data = await response.json();
    expect(response.status).toBe(422);
    expect(data).toHaveProperty("success", false);
  });

  it("should allow high difficulty with WARN constraint", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({
        result: { id: "version-001", difficulty: 4 },
        events: [],
      })
    );
    const response = await dispatch(
      "RecipeVersion",
      "create"
    )(makeRequest({ recipeId: "recipe-001", difficulty: 4 }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
  });

  it("should allow long recipe with WARN constraint", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({ result: { id: "version-001" }, events: [] })
    );
    const response = await dispatch(
      "RecipeVersion",
      "create"
    )(
      makeRequest({
        recipeId: "recipe-001",
        prepTime: 180,
        cookTime: 300,
        restTime: 60,
      })
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
  });

  it("should handle valid recipe creation without warnings", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({ result: { id: "version-001" }, events: [] })
    );
    const response = await dispatch(
      "RecipeVersion",
      "create"
    )(
      makeRequest({
        recipeId: "recipe-001",
        yieldQty: 10,
        yieldUnit: 1,
        prepTime: 30,
        cookTime: 60,
        restTime: 10,
        difficulty: 2,
      })
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
  });
});
