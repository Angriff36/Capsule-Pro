import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const setPackaging = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/app/lib/manifest-client.generated", () => ({
  recipeVersionSetPackaging: (...args: unknown[]) => setPackaging(...args),
}));

import { RecipePackagingEditor } from "../../../app/(authenticated)/(operations)/kitchen/recipes/[recipeId]/components/recipe-packaging-editor";

describe("RecipePackagingEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPackaging.mockResolvedValue({ id: "version-1" });
  });

  it("saves packaging notes through RecipeVersion.setPackaging", async () => {
    const user = userEvent.setup();

    render(
      <RecipePackagingEditor
        packaging={{
          dropOff: "",
          bringHot: "",
          cookOnSite: "",
        }}
        recipeVersionId="version-1"
      />
    );

    await user.type(
      screen.getByPlaceholderText(/packaging for drop-off/i),
      "Seal trays"
    );
    await user.type(
      screen.getByPlaceholderText(/packaging for bring-hot/i),
      "Hot box"
    );
    await user.type(
      screen.getByPlaceholderText(/packaging for cook-on-site/i),
      "Finish sauce"
    );

    await user.click(screen.getByRole("button", { name: /save packaging/i }));

    expect(setPackaging).toHaveBeenCalledWith({
      id: "version-1",
      dropOff: "Seal trays",
      bringHot: "Hot box",
      cookOnSite: "Finish sauce",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps Save disabled until packaging notes change", () => {
    render(
      <RecipePackagingEditor
        packaging={{
          dropOff: "Already set",
          bringHot: "",
          cookOnSite: "",
        }}
        recipeVersionId="version-1"
      />
    );

    expect(
      screen
        .getByRole("button", { name: /save packaging/i })
        .hasAttribute("disabled")
    ).toBe(true);
  });
});
