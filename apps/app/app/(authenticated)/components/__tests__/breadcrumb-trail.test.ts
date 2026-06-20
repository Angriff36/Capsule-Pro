import { describe, expect, it } from "vitest";
import { generateBreadcrumbTrail } from "../breadcrumb-trail";

const EVENT_UUID = "11111111-1111-4111-8111-111111111111";
const PREP_LIST_UUID = "22222222-2222-4222-8222-222222222222";
const TASK_UUID = "33333333-3333-4333-8333-333333333333";

describe("generateBreadcrumbTrail", () => {
  it("returns an empty trail at a module root", () => {
    const { items, context } = generateBreadcrumbTrail("/events");
    expect(items).toEqual([]);
    expect(context?.label).toBe("Events");
  });

  it("returns empty items with context for the app root", () => {
    const { items } = generateBreadcrumbTrail("/");
    expect(items).toEqual([]);
  });

  it("renders module root + a static sub-page as the current page", () => {
    const { items } = generateBreadcrumbTrail("/events/kitchen-dashboard");
    expect(items).toEqual([
      { label: "Events", href: "/events" },
      { label: "Kitchen Dashboard" },
    ]);
    // current page crumb has no href
    expect(items.at(-1)?.href).toBeUndefined();
  });

  it("resolves a dynamic event id into a clickable 'Event' ancestor", () => {
    const { items } = generateBreadcrumbTrail(`/events/${EVENT_UUID}/budget`);
    expect(items).toEqual([
      { label: "Events", href: "/events" },
      { label: "Event", href: `/events/${EVENT_UUID}` },
      { label: "Budget" },
    ]);
  });

  it("builds the full 5-level entity chain described by the feature", () => {
    const path = `/events/${EVENT_UUID}/prep-lists/${PREP_LIST_UUID}/tasks/${TASK_UUID}`;
    const { items, context } = generateBreadcrumbTrail(path);

    expect(context?.label).toBe("Events");
    expect(items).toEqual([
      { label: "Events", href: "/events" },
      { label: "Event", href: `/events/${EVENT_UUID}` },
      { label: "Prep Lists", href: `/events/${EVENT_UUID}/prep-lists` },
      {
        label: "Prep List",
        href: `/events/${EVENT_UUID}/prep-lists/${PREP_LIST_UUID}`,
      },
      {
        label: "Tasks",
        href: `/events/${EVENT_UUID}/prep-lists/${PREP_LIST_UUID}/tasks`,
      },
      { label: "Task" },
    ]);
  });

  it("formats a numeric task id as 'Task #<n>' for the current page", () => {
    const { items } = generateBreadcrumbTrail(
      `/events/${EVENT_UUID}/prep-lists/${PREP_LIST_UUID}/tasks/4`
    );
    expect(items.at(-1)).toEqual({ label: "Task #4" });
  });

  it("works across other modules (kitchen recipe detail)", () => {
    const { items, context } = generateBreadcrumbTrail(
      `/kitchen/recipes/${EVENT_UUID}`
    );
    expect(context?.label).toBe("Kitchen");
    expect(items).toEqual([
      { label: "Kitchen", href: "/kitchen" },
      { label: "Recipes", href: "/kitchen/recipes" },
      { label: "Recipe" },
    ]);
  });

  it("handles multi-component module roots (logistics/routes)", () => {
    const root = generateBreadcrumbTrail("/logistics/routes");
    expect(root.items).toEqual([]);
    expect(root.context?.label).toBe("Logistics");

    const deep = generateBreadcrumbTrail(`/logistics/routes/${EVENT_UUID}`);
    expect(deep.items).toEqual([
      { label: "Logistics", href: "/logistics/routes" },
      { label: "Route" },
    ]);
  });

  it("title-cases unknown static segments rather than dropping them", () => {
    const { items } = generateBreadcrumbTrail("/events/some-new-page");
    expect(items).toEqual([
      { label: "Events", href: "/events" },
      { label: "Some New Page" },
    ]);
  });

  it("always strips the href from the final (current) crumb", () => {
    const { items } = generateBreadcrumbTrail(`/events/${EVENT_UUID}/budget`);
    expect(items.at(-1)?.href).toBeUndefined();
  });
});
