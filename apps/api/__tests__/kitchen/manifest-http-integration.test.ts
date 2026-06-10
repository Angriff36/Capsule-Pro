/**
 * HTTP Integration Test: Manifest-Generated Routes
 *
 * Tests that Manifest-generated API routes properly handle HTTP requests,
 * enforce auth, and return proper JSON responses.
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
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock("@/lib/manifest/execute-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn((data, status = 200) => new Response(JSON.stringify({ success: true, ...(typeof data === "object" && data !== null ? data : { data }) }), { status })),
  manifestErrorResponse: vi.fn((message, status = 400) => {
    const body = typeof message === "string" ? { success: false, message } : { success: false, error: message.error, diagnostics: message.diagnostics ?? [] };
    return new Response(JSON.stringify(body), { status });
  }),
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error { name = "InvariantError" as const; constructor(m: string) { super(m); this.name = "InvariantError"; } }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({ dispatchWebhooks: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({ runManifestCommandCore: vi.fn() }));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { InvariantError } from "@/app/lib/invariant";
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

describe("Manifest HTTP Integration - PrepTask Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  for (const cmd of ["claim", "start", "complete", "release", "reassign", "update-quantity", "cancel"]) {
    describe(`POST PrepTask.${cmd}`, () => {
      it("should import and expose the route handler", async () => {
        expect(manifestDispatch).toBeDefined();
        expect(typeof manifestDispatch).toBe("function");
      });
    });
  }

  it("should reject unauthorized claim requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("PrepTask", "claim")(makeRequest({ id: "task-001", userId: "user-001", stationId: "station-a" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
    expect(data).toHaveProperty("message", "Unauthenticated");
  });

  it("should handle claim requests with valid data", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      manifestSuccessResponse({ result: { id: "task-001", status: "in_progress" }, events: [] })
    );

    const response = await dispatch("PrepTask", "claim")(makeRequest({ id: "task-001", userId: "user-001", stationId: "station-a" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("result");
  });
});

describe("Manifest HTTP Integration - Menu Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized menu update requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("Menu", "update")(makeRequest({ id: "menu-001", name: "Updated Menu" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Integration - Station Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized station assign-task requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("Station", "assign-task")(makeRequest({ stationId: "station-001", taskId: "task-001" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Integration - Inventory Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized inventory reserve requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("InventoryItem", "reserve")(makeRequest({ itemId: "item-001", quantity: 10 }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Integration - Recipe Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized recipe update requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("Recipe", "update")(makeRequest({ id: "recipe-001", name: "Updated Recipe" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Integration - Dish Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized dish update-pricing requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("Dish", "update-pricing")(makeRequest({ id: "dish-001", costPerPortionCents: 500, salesPriceCents: 1500 }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Integration - Ingredient Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized ingredient update-allergens requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("Ingredient", "update-allergens")(makeRequest({ id: "ingredient-001", allergens: ["gluten", "dairy"] }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Integration - RecipeIngredient Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized recipe-ingredient update-quantity requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("RecipeIngredient", "update-quantity")(makeRequest({ id: "ri-001", quantity: 500 }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});

describe("Manifest HTTP Integration - PrepList Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("should reject unauthorized prep-list finalize requests", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new InvariantError("Unauthenticated"));

    const response = await dispatch("PrepList", "finalize")(makeRequest({ id: "prep-list-001" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("success", false);
  });
});
