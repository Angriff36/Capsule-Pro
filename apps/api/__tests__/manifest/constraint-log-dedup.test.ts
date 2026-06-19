/**
 * Regression: the engine logs `[Manifest Runtime] Non-blocking constraint
 * outcomes:` once PER mutate, so a single Event.update (~41 mutates) spammed
 * the same warnLargeGuestCount block ~41x. createConstraintInfoFilter collapses
 * identical repeats within a window to a single line, leaving all other logs
 * untouched. Pure + clock-injected → deterministic, no global console state.
 */
import { describe, expect, it, vi } from "vitest";
import { createConstraintInfoFilter } from "@/lib/manifest/constraint-log-dedup";

const MARKER = "[Manifest Runtime] Non-blocking constraint outcomes:";

describe("createConstraintInfoFilter", () => {
  it("collapses ~41 identical constraint-outcome lines to one", () => {
    const sink = vi.fn();
    let clock = 1000;
    const filter = createConstraintInfoFilter(sink, () => clock);
    const outcomes = [{ code: "warnLargeGuestCount", severity: "warn" }];

    for (let i = 0; i < 41; i++) {
      clock += 1; // all within the 1000ms window
      filter(MARKER, outcomes);
    }

    const markerLines = sink.mock.calls.filter((c) => c[0] === MARKER);
    expect(markerLines).toHaveLength(1);
  });

  it("passes through unrelated logs verbatim", () => {
    const sink = vi.fn();
    const filter = createConstraintInfoFilter(sink, () => 0);

    filter("hello", 1, 2);
    filter("[Manifest Runtime] something else", { a: 1 });

    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink).toHaveBeenNthCalledWith(1, "hello", 1, 2);
  });

  it("re-emits once the dedupe window elapses, with a suppressed-count summary", () => {
    const sink = vi.fn();
    let clock = 0;
    const filter = createConstraintInfoFilter(sink, () => clock);
    const outcomes = [{ code: "warnLargeGuestCount" }];

    filter(MARKER, outcomes); // emitted (1st)
    clock = 100;
    filter(MARKER, outcomes); // suppressed
    clock = 5000; // window elapsed → flush summary + emit again
    filter(MARKER, outcomes);

    const lines = sink.mock.calls.map((c) => String(c[0]));
    // 1st marker line + a "(+1 ... suppressed)" summary + the re-emitted marker.
    expect(lines.filter((l) => l === MARKER)).toHaveLength(2);
    expect(lines.some((l) => l.includes("suppressed"))).toBe(true);
  });

  it("treats a different constraint outcome as a distinct line", () => {
    const sink = vi.fn();
    const filter = createConstraintInfoFilter(sink, () => 0);

    filter(MARKER, [{ code: "warnLargeGuestCount" }]);
    filter(MARKER, [{ code: "warnSomethingElse" }]);

    expect(sink.mock.calls.filter((c) => c[0] === MARKER)).toHaveLength(2);
  });
});
