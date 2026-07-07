import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock(
  "../app/(authenticated)/kitchen/prep-lists/components/prep-list-form-with-constraints",
  () => ({
    PrepListSaveButton: () => <button type="button">Save to Database</button>,
  })
);

import type { PrepListGenerationResult } from "../../app/(authenticated)/(operations)/kitchen/prep-lists/actions";
import { PrepListClient } from "../../app/(authenticated)/(operations)/kitchen/prep-lists/prep-list-client";

const AVAILABLE_EVENTS = [
  {
    id: "event-1",
    title: "Spring Tasting",
    eventDate: new Date("2026-06-20T18:00:00Z"),
    guestCount: 42,
  },
];

function makeResult(
  overrides: Partial<PrepListGenerationResult>
): PrepListGenerationResult {
  return {
    eventId: "event-1",
    eventTitle: "Spring Tasting",
    eventDate: new Date("2026-06-20T18:00:00Z"),
    guestCount: 42,
    batchMultiplier: 1,
    dietaryRestrictions: [],
    generatedAt: new Date(),
    linkedDishCount: 0,
    resolvedDishCount: 0,
    unresolvedDishes: [],
    stationLists: [],
    totalIngredients: 0,
    totalEstimatedTime: 0,
    ...overrides,
  };
}

// Before generation the page must NOT claim "no dishes linked" — it cannot
// know that yet. It should invite the user to generate instead.
test("shows a neutral not-generated state before any generation attempt", () => {
  render(
    <PrepListClient
      availableEvents={AVAILABLE_EVENTS}
      eventId="event-1"
      initialError={null}
      initialPrepList={null}
    />
  );

  expect(
    screen
      .getByRole("button", { name: /generate prep list/i })
      .hasAttribute("disabled")
  ).toBe(false);
  expect(screen.getByText(/no prep list yet/i)).toBeTruthy();
  expect(screen.queryByText(/no dishes linked/i)).toBeNull();
});

// A backend failure must surface as a failure, not be converted into an
// empty state that blames the event's data.
test("shows the specific server error when initial generation failed", () => {
  render(
    <PrepListClient
      availableEvents={AVAILABLE_EVENTS}
      eventId="event-1"
      initialError="Failed to generate prep list: column does not exist"
      initialPrepList={null}
    />
  );

  expect(screen.getByText(/generation failed/i)).toBeTruthy();
  expect(screen.getByText(/column does not exist/i)).toBeTruthy();
  expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
});

// Only after generation confirms event_dishes is empty may the page say so.
test("shows 'no dishes linked' only when generation confirmed zero linked dishes", () => {
  render(
    <PrepListClient
      availableEvents={AVAILABLE_EVENTS}
      eventId="event-1"
      initialError={null}
      initialPrepList={makeResult({ linkedDishCount: 0 })}
    />
  );

  expect(screen.getByText(/no dishes linked to this event/i)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /add dishes to event/i })
  ).toBeTruthy();
});

// Dishes linked but not expandable must be explained per dish, per reason —
// this is the diagnostic that replaces the old misleading empty state.
test("explains unresolved dishes when linked dishes produce zero ingredients", () => {
  render(
    <PrepListClient
      availableEvents={AVAILABLE_EVENTS}
      eventId="event-1"
      initialError={null}
      initialPrepList={makeResult({
        linkedDishCount: 2,
        resolvedDishCount: 0,
        unresolvedDishes: [
          {
            dishId: "dish-1",
            dishName: "Herb Salmon",
            reason: "no_recipe",
            recipeId: null,
            recipeName: null,
          },
          {
            dishId: "dish-2",
            dishName: "Citrus Tart",
            reason: "no_ingredients",
            recipeId: "recipe-2",
            recipeName: "Citrus Tart Base",
          },
        ],
      })}
    />
  );

  expect(
    screen.getByText(/no ingredients could be resolved/i)
  ).toBeTruthy();
  expect(screen.getByText("Herb Salmon")).toBeTruthy();
  expect(screen.getByText(/no recipe linked to this dish/i)).toBeTruthy();
  expect(screen.getByText("Citrus Tart")).toBeTruthy();
  expect(
    screen.getByText(/recipe version has no ingredients/i)
  ).toBeTruthy();
});
