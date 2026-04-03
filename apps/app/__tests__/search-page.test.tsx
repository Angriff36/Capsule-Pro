import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../app/(authenticated)/components/header", () => ({
  Header: ({ page }: { page: string }) => <div>{page}</div>,
}));

import SearchPage from "../app/(authenticated)/search/page";

test("Search page shows non-empty UI when no query is present", async () => {
  render(<SearchPage />);

  expect(
    await screen.findByText(/enter a search term|use the search bar/i)
  ).toBeDefined();
});
