import { describe, expect, it } from "vitest";

import { withQueryTiming } from "../query-timing";

describe("withQueryTiming", () => {
  it("is a no-op when PRISMA_LOG_QUERIES is unset (prod-safe, zero $extends overhead)", () => {
    // PRISMA_LOG_QUERIES is unset in the test env, so withQueryTiming must
    // return the client unchanged WITHOUT invoking $extends. This invariant
    // is what keeps production at zero overhead: every authenticated request
    // flows through `database`, so the timing hook must be absent in prod.
    type Client = Parameters<typeof withQueryTiming>[0];
    const fakeClient = { __brand: "untouched" } as unknown as Client;

    expect(withQueryTiming(fakeClient)).toBe(fakeClient);
  });
});
