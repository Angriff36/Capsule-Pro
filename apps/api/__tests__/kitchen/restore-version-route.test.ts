import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/kitchen/recipes/[id]/composite/restore-version/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  captureException: vi.fn(),
  createManifestRuntime: vi.fn(),
  database: {
    recipeVersion: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
    },
    recipeIngredient: {
      findMany: vi.fn(),
    },
    recipeStep: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(
      (callback: (txClient: Record<string, never>) => unknown) =>
        callback({})
    ),
  },
  getTenantIdForOrg: vi.fn(),
  logError: vi.fn(),
  requireCurrentUser: vi.fn(),
  runCommand: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@repo/database", () => ({
  database: mocks.database,
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: mocks.createManifestRuntime,
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.getTenantIdForOrg,
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: mocks.logError },
}));

describe("POST /api/kitchen/recipes/[id]/composite/restore-version", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant-1");
    mocks.requireCurrentUser.mockResolvedValue({
      id: "employee-1",
      tenantId: "tenant-1",
      role: "admin",
      email: "",
      firstName: "",
      lastName: "",
    });

    vi.mocked(database.recipeVersion.findFirst).mockResolvedValue({
      id: "version-1",
      recipeId: "recipe-1",
      name: "Source Recipe",
      category: "Entree",
      cuisineType: "Italian",
      description: "Source description",
      tags: ["dinner"],
      yieldQuantity: 4,
      yieldUnitId: 1,
      yieldDescription: "servings",
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      restTimeMinutes: 0,
      difficultyLevel: 2,
      instructions: "Cook it",
      notes: "Keep warm",
      dropOffNotes: "Restored drop-off",
      bringHotNotes: "Restored bring-hot",
      cookOnSiteNotes: "Restored cook-on-site",
    } as never);
    vi.mocked(database.recipeVersion.aggregate).mockResolvedValue({
      _max: { versionNumber: 2 },
    } as never);
    vi.mocked(database.recipeIngredient.findMany).mockResolvedValue([]);
    vi.mocked(database.recipeStep.findMany).mockResolvedValue([]);

    mocks.runCommand.mockImplementation((command, payload, options) =>
      Promise.resolve({
        success: true,
        result: { command, entityName: options.entityName, ...payload },
        emittedEvents: [],
        constraintOutcomes: [],
      })
    );
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: mocks.runCommand,
    } as never);
  });

  it("carries packaging notes from the restored source version", async () => {
    const request = new NextRequest(
      "https://example.com/api/kitchen/recipes/recipe-1/composite/restore-version",
      {
        method: "POST",
        body: JSON.stringify({ sourceVersionId: "version-1" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "recipe-1" }),
    });
    expect(response.status).toBe(200);

    const versionCreate = mocks.runCommand.mock.calls.find(
      (call) =>
        call[0] === "create" &&
        (call[2] as { entityName?: string })?.entityName === "RecipeVersion"
    );
    expect(versionCreate).toBeDefined();
    expect(versionCreate?.[1]).toMatchObject({
      dropOffNotes: "Restored drop-off",
      bringHotNotes: "Restored bring-hot",
      cookOnSiteNotes: "Restored cook-on-site",
      versionNumber: 3,
    });
  });
});
