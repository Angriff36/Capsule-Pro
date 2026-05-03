import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import SearchPage from "../app/(authenticated)/search/page";

test("Search page shows non-empty UI when no query is present", async () => {
  render(<SearchPage />);

  expect(
    (await screen.findAllByText(/global search/i)).length
  ).toBeGreaterThan(0);
});
