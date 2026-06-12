import { RuntimeEngine } from "@angriff36/manifest";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { beforeAll, describe, expect, it } from "vitest";
import {
  addDays,
  containsAny,
  createCustomBuiltins,
  daysBetween,
  hoursBetween,
  percent,
  removeTagFromString,
} from "../manifest-builtins.js";

const DAY = 86_400_000;
const HOUR = 3_600_000;

describe("custom builtins — pure functions", () => {
  describe("daysBetween", () => {
    it("returns whole + fractional days from `from` to `to`", () => {
      expect(daysBetween(0, 3 * DAY)).toBe(3);
      expect(daysBetween(0, DAY / 2)).toBe(0.5);
      expect(daysBetween(3 * DAY, 0)).toBe(-3);
    });

    // WHY: the helper must be byte-equivalent to the inline expression it
    // replaces — `(self.endDate - now()) / 86400000` — or migration silently
    // changes finance/scheduling behavior.
    it("equals the inline `(to - from) / 86400000` it replaces", () => {
      const from = 1_700_000_000_000;
      const to = 1_700_500_000_000;
      expect(daysBetween(from, to)).toBe((to - from) / 86_400_000);
    });

    it("returns NaN for non-numeric input (fails closed, not null→0)", () => {
      expect(daysBetween(null, 3 * DAY)).toBeNaN();
    });
  });

  describe("hoursBetween", () => {
    it("returns whole + fractional hours from `from` to `to`", () => {
      expect(hoursBetween(0, 72 * HOUR)).toBe(72);
      expect(hoursBetween(0, HOUR / 4)).toBe(0.25);
    });

    // WHY: replaces `(self.shiftEnd - self.shiftStart) / 3600000`.
    it("equals the inline `(to - from) / 3600000` it replaces", () => {
      const from = 1_700_000_000_000;
      const to = 1_700_000_000_000 + 5 * HOUR + 123;
      expect(hoursBetween(from, to)).toBe((to - from) / 3_600_000);
    });
  });

  describe("addDays", () => {
    it("adds N days to an epoch-millis timestamp", () => {
      expect(addDays(0, 30)).toBe(30 * DAY);
      expect(addDays(DAY, -1)).toBe(0);
    });

    // WHY: replaces `now() + (30 * 86400000)`.
    it("equals the inline `t + days * 86400000` it replaces", () => {
      const t = 1_700_000_000_000;
      expect(addDays(t, 30)).toBe(t + 30 * 86_400_000);
    });
  });

  describe("percent", () => {
    it("computes (part / whole) * 100", () => {
      expect(percent(50, 200)).toBe(25);
      expect(percent(1, 3)).toBeCloseTo(33.3333, 3);
    });

    // WHY: the entire point of the helper is to fold in the divide-by-zero
    // guard that ~14 copies hand-wrote as `whole > 0 ? ... : 0`.
    it("returns 0 when whole is not positive (matches the zero-guard ternary)", () => {
      expect(percent(50, 0)).toBe(0);
      expect(percent(50, -10)).toBe(0);
    });

    it("equals the inline `whole > 0 ? part/whole*100 : 0` it replaces", () => {
      for (const [part, whole] of [
        [50, 200],
        [0, 10],
        [7, 0],
        [3, 9],
      ]) {
        const inline = whole > 0 ? (part / whole) * 100 : 0;
        expect(percent(part, whole)).toBe(inline);
      }
    });
  });

  describe("containsAny", () => {
    it("matches when an array haystack includes any needle", () => {
      expect(containsAny(["server", "vip"], ["vip", "rush"])).toBe(true);
      expect(containsAny(["server"], ["vip", "rush"])).toBe(false);
    });

    it("matches substrings when haystack is a comma-joined string (allergens)", () => {
      // WHY: `allergens` is a `string`, and the replaced expression is a
      // chain of `self.allergens contains "nuts"` substring tests.
      expect(containsAny("contains dairy and soy", ["nuts", "dairy"])).toBe(
        true
      );
      expect(containsAny("contains soy", ["nuts", "dairy"])).toBe(false);
    });

    it("equals the inline `f contains a or f contains b` it replaces", () => {
      const allergens = "milk, gluten, peanut";
      const inline =
        allergens.includes("nuts") ||
        allergens.includes("dairy") ||
        allergens.includes("gluten");
      expect(containsAny(allergens, ["nuts", "dairy", "gluten"])).toBe(inline);
    });

    it("returns false for non-array needles or unsupported haystack", () => {
      expect(containsAny("x", "y" as unknown)).toBe(false);
      expect(containsAny(42, ["4"])).toBe(false);
    });
  });

  describe("removeTagFromString", () => {
    it("removes a tag from the middle of a comma-separated string", () => {
      expect(removeTagFromString("urgent,cleanup,prep", "cleanup")).toBe(
        "urgent,prep"
      );
    });

    it("removes a tag from the start", () => {
      expect(removeTagFromString("urgent,cleanup", "urgent")).toBe("cleanup");
    });

    it("removes a tag from the end", () => {
      expect(removeTagFromString("urgent,cleanup", "cleanup")).toBe("urgent");
    });

    it("removes the only tag, producing empty string", () => {
      expect(removeTagFromString("urgent", "urgent")).toBe("");
    });

    it("returns original string when tag is not found", () => {
      expect(removeTagFromString("urgent,cleanup", "missing")).toBe(
        "urgent,cleanup"
      );
    });

    it("returns empty string when tags input is empty", () => {
      expect(removeTagFromString("", "urgent")).toBe("");
    });

    it("returns original string when tag param is empty", () => {
      expect(removeTagFromString("urgent,cleanup", "")).toBe("urgent,cleanup");
    });

    it("removes all occurrences of duplicate tag", () => {
      expect(removeTagFromString("urgent,cleanup,urgent", "urgent")).toBe(
        "cleanup"
      );
    });
  });

  it("createCustomBuiltins registers exactly the six project helpers", () => {
    const map = createCustomBuiltins();
    expect([...map.keys()].sort()).toEqual(
      [
        "addDays",
        "containsAny",
        "daysBetween",
        "hoursBetween",
        "percent",
        "removeTagFromString",
      ].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// End-to-end: the compiler accepts the custom builtin names in expressions AND
// the runtime resolves them via RuntimeOptions.customBuiltins. This is the
// proof that "turning it on" works — not just that the functions are correct.
// ---------------------------------------------------------------------------

const PROBE_SOURCE = `
entity BuiltinProbe {
  property required id: string
  property total: number = 0
  property done: number = 0
  property startMs: number = 0
  property endMs: number = 0
  property allergens: string = ""
  property tags: string[] = []

  computed pctDone: number = percent(self.done, self.total)
  computed daysSpan: number = daysBetween(self.startMs, self.endMs)
  computed hoursSpan: number = hoursBetween(self.startMs, self.endMs)
  computed plusThreeDays: number = addDays(self.startMs, 3)
  computed allergenHit: boolean = containsAny(self.allergens, ["nuts", "dairy"])
  computed tagHit: boolean = containsAny(self.tags, ["vip", "rush"])
}
`;

describe("custom builtins — end-to-end through the runtime", () => {
  // biome-ignore lint/suspicious/noExplicitAny: IR type is structural; engine accepts it.
  let ir: any;

  beforeAll(async () => {
    const result = await compileToIR(PROBE_SOURCE);
    // The compiler must accept computed expressions that reference the custom
    // builtin names without erroring (it passes function names through).
    expect(result.ir).toBeTruthy();
    ir = result.ir;
  });

  async function seedProbe(engine: RuntimeEngine) {
    await engine.createInstance("BuiltinProbe", {
      id: "p1",
      total: 200,
      done: 50,
      startMs: 0,
      endMs: 3 * DAY,
      allergens: "contains dairy and soy",
      tags: ["server", "vip"],
    } as never);
  }

  it("evaluates computed properties that call custom builtins", async () => {
    const engine = new RuntimeEngine(
      ir,
      { user: { id: "test-user" } },
      { customBuiltins: createCustomBuiltins() }
    );
    await seedProbe(engine);

    expect(await engine.evaluateComputed("BuiltinProbe", "p1", "pctDone")).toBe(
      25
    );
    expect(
      await engine.evaluateComputed("BuiltinProbe", "p1", "daysSpan")
    ).toBe(3);
    expect(
      await engine.evaluateComputed("BuiltinProbe", "p1", "hoursSpan")
    ).toBe(72);
    expect(
      await engine.evaluateComputed("BuiltinProbe", "p1", "plusThreeDays")
    ).toBe(3 * DAY);
    // string haystack (allergens) + array haystack (tags)
    expect(
      await engine.evaluateComputed("BuiltinProbe", "p1", "allergenHit")
    ).toBe(true);
    expect(await engine.evaluateComputed("BuiltinProbe", "p1", "tagHit")).toBe(
      true
    );
  });

  // WHY: proves the custom builtins are actually doing the work. Without the
  // customBuiltins map the same IR must NOT silently produce the right answer —
  // the names are unresolved, so evaluation fails rather than coincidentally
  // matching.
  it("does NOT resolve the builtins when customBuiltins is omitted", async () => {
    const engine = new RuntimeEngine(ir, { user: { id: "test-user" } });
    await seedProbe(engine);

    let resolvedCorrectly = false;
    try {
      const value = await engine.evaluateComputed(
        "BuiltinProbe",
        "p1",
        "pctDone"
      );
      resolvedCorrectly = value === 25;
    } catch {
      resolvedCorrectly = false;
    }
    expect(resolvedCorrectly).toBe(false);
  });
});
