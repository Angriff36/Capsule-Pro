import { describe, expect, it } from "vitest";

import { normalizeMenuTab } from "../../app/(authenticated)/events/[eventId]/event-details-client/menu-tab-utils";
import { getEventMenuDishesHref } from "../../app/(authenticated)/kitchen/prep-lists/navigation";

describe("menu tab routing", () => {
  it("builds prep-list CTA href to event menu dishes tab", () => {
    expect(getEventMenuDishesHref("evt_123")).toBe(
      "/events/evt_123?tab=menu&menuTab=dishes"
    );
  });

  it("normalizes menu tab with dishes as default", () => {
    expect(normalizeMenuTab(null)).toBe("dishes");
    expect(normalizeMenuTab("recipes")).toBe("recipes");
    expect(normalizeMenuTab("invalid")).toBe("dishes");
  });
});
