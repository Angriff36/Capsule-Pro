/**
 * @vitest-environment node
 *
 * Pins Ingredient.create allergens to string[] (Manifest Zod + Prisma String[]).
 * Regression: actions-ingredient previously .join(",")'d the list into a string,
 * which failed preflight param validation before the runtime ran.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { createIngredient } from "../../app/(authenticated)/(operations)/kitchen/recipes/actions-ingredient";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const INGREDIENT_ID = "ingredient-1";

function formWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

/** Mirrors the ingredients-tab badge loop: one token per array element. */
function allergenTokens(allergens: string[] | null | undefined): string[] {
  return (allergens ?? []).slice(0, 3);
}

describe("createIngredient allergens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    });
    runCommand.mockResolvedValue({
      ok: true,
      result: { id: INGREDIENT_ID },
    });
  });

  it("sends empty allergens as string[] when the field is blank", async () => {
    const result = await createIngredient(
      formWith({
        name: "All-purpose flour",
        allergens: "",
      })
    );

    expect(result.success).toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Ingredient",
        command: "create",
        body: expect.objectContaining({
          name: "All-purpose flour",
          allergens: [],
        }),
      })
    );
    const emptyBody = runCommand.mock.calls[0]?.[0]?.body as
      | { allergens?: unknown }
      | undefined;
    expect(Array.isArray(emptyBody?.allergens)).toBe(true);
    expect(typeof emptyBody?.allergens).not.toBe("string");
    expect(allergenTokens([])).toEqual([]);
    expect(revalidate).toHaveBeenCalledWith("/kitchen/recipes");
  });

  it("sends multiple allergens as discrete string[] tokens", async () => {
    const result = await createIngredient(
      formWith({
        name: "Heavy cream",
        allergens: "nuts, dairy, gluten",
      })
    );

    expect(result.success).toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Ingredient",
        command: "create",
        body: expect.objectContaining({
          allergens: ["nuts", "dairy", "gluten"],
        }),
      })
    );

    const multiBody = runCommand.mock.calls[0]?.[0]?.body as
      | { allergens?: string[] }
      | undefined;
    const sent = multiBody?.allergens ?? [];
    expect(Array.isArray(sent)).toBe(true);
    expect(sent).toEqual(["nuts", "dairy", "gluten"]);
    expect(sent).not.toEqual(["nuts, dairy, gluten"]);
    expect(allergenTokens(sent)).toEqual(["nuts", "dairy", "gluten"]);
  });
});
