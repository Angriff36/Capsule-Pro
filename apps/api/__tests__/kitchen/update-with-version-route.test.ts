import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/kitchen/recipes/[id]/composite/update-with-version/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const mocks = vi.hoisted(() => {
  const tx = {
    recipe: {
      findFirst: vi.fn(),
    },
    recipeVersion: {
      findFirst: vi.fn(),
    },
  };

  return {
    auth: vi.fn(),
    captureException: vi.fn(),
    createManifestRuntime: vi.fn(),
    database: {
      recipe: {
        findFirst: vi.fn(),
      },
      recipeVersion: {
        aggregate: vi.fn(),
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((callback: (txClient: typeof tx) => unknown) =>
        callback(tx)
      ),
    },
    getTenantIdForOrg: vi.fn(),
    logError: vi.fn(),
    requireCurrentUser: vi.fn(),
    resolveIngredients: vi.fn(),
    runCommand: vi.fn(),
    tx,
  };
});

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@repo/database", () => ({
  database: mocks.database,
  resolveIngredients: mocks.resolveIngredients,
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

describe("POST /api/kitchen/recipes/[id]/composite/update-with-version", () => {
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

    vi.mocked(database.recipeVersion.aggregate).mockResolvedValue({
      _max: { versionNumber: 1 },
    } as never);

    mocks.database.recipe.findFirst.mockRejectedValue(
      new Error("root recipe client used")
    );
    mocks.database.recipeVersion.findFirst.mockRejectedValue(
      new Error("root recipeVersion client used")
    );

    mocks.tx.recipe.findFirst.mockResolvedValue({
      name: "Current Recipe",
      category: "Entree",
      cuisineType: "Italian",
      description: "Current description",
      tags: ["dinner"],
    });
    mocks.tx.recipeVersion.findFirst.mockResolvedValue({
      name: "Current Recipe",
      category: "Entree",
      cuisineType: "Italian",
      description: "Current description",
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
      dropOffNotes: "Seal trays; label allergen",
      bringHotNotes: "Hot box at 165F",
      cookOnSiteNotes: "Finish sauce on site",
    });

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

  it("uses the transaction client for recipe reads inside the transaction", async () => {
    const request = new NextRequest(
      "https://example.com/api/kitchen/recipes/recipe-1/composite/update-with-version",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Updated Recipe",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "recipe-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.version).toMatchObject({
      entityName: "RecipeVersion",
      recipeId: "recipe-1",
      name: "Updated Recipe",
      versionNumber: 2,
    });
    expect(mocks.database.recipe.findFirst).not.toHaveBeenCalled();
    expect(mocks.database.recipeVersion.findFirst).not.toHaveBeenCalled();
    expect(mocks.tx.recipe.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "recipe-1",
          tenantId: "tenant-1",
        }),
      })
    );
    expect(mocks.tx.recipeVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recipeId: "recipe-1",
          tenantId: "tenant-1",
        }),
        select: expect.objectContaining({
          dropOffNotes: true,
          bringHotNotes: true,
          cookOnSiteNotes: true,
        }),
      })
    );
  });

  it("carries packaging notes from the latest version onto the new version", async () => {
    const request = new NextRequest(
      "https://example.com/api/kitchen/recipes/recipe-1/composite/update-with-version",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Updated Recipe",
        }),
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
      dropOffNotes: "Seal trays; label allergen",
      bringHotNotes: "Hot box at 165F",
      cookOnSiteNotes: "Finish sauce on site",
    });
  });
});
