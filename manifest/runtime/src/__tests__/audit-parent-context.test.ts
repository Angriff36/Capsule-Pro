import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error — .mjs audit script, run via vitest's ESM loader
// @boundaries-ignore automatically added by `turbo boundaries --ignore=all`
"../../../scripts/audit-parent-context.mjs";

// ---------------------------------------------------------------------------
// Static backpressure for the parent-context invariant: a child `create` must
// not REQUIRE, as user input, a field inferable from its belongsTo parent.
//
// WHY: this is the gate that stops a future Ralph loop from re-introducing the
// "re-enter the event's date/venue/client on every child" anti-pattern. If the
// gate could not fail, it would be theatre — so we prove both directions:
// the committed IR is clean, AND a planted regression is caught.
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
const allowlistPath = join(
  here,
  "..",
  "..",
  "..",
  "governance",
  "parent-context-overrides.json"
);

// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));
const allowlist: Record<string, { fields: string[] }> =
  JSON.parse(readFileSync(allowlistPath, "utf8")).overrides ?? {};

describe("parent-context audit — committed IR is clean under the allowlist", () => {
  it("reports zero unallowlisted violations (the strict gate passes)", () => {
    const violations = scanParentContextViolations(ir, allowlist);
    expect(violations).toEqual([]);
  });

  it("BattleBoard.create requires NO parent-owned field — even without the allowlist", () => {
    const raw = scanParentContextViolations(ir, {});
    // The whole point of the fix: BattleBoard inherits event context, so it is
    // never a violator regardless of allowlisting.
    expect(
      raw.find((v: { child: string }) => v.child === "BattleBoard")
    ).toBeUndefined();
  });

  it("every allowlisted entry corresponds to a real detected case (no dead allowlist)", () => {
    const raw = scanParentContextViolations(ir, {});
    const detected = new Set(
      raw.map((v: { child: string; field: string }) => `${v.child}.${v.field}`)
    );
    for (const [entity, entry] of Object.entries(allowlist)) {
      for (const field of entry.fields) {
        expect(detected.has(`${entity}.${field}`)).toBe(true);
      }
    }
  });
});

describe("parent-context audit — the gate actually bites", () => {
  // A child that REQUIRES a parent-owned context field as input (the anti-pattern).
  const plantedIR = {
    entities: [
      {
        name: "Event",
        properties: [
          { name: "id", type: { name: "string" }, modifiers: ["required"] },
          {
            name: "tenantId",
            type: { name: "string" },
            modifiers: ["required"],
          },
          {
            name: "eventDate",
            type: { name: "datetime" },
            modifiers: ["required"],
          },
        ],
        relationships: [],
        commands: ["create"],
      },
      {
        name: "PlannedChild",
        properties: [
          { name: "id", type: { name: "string" }, modifiers: ["required"] },
          {
            name: "tenantId",
            type: { name: "string" },
            modifiers: ["required"],
          },
          { name: "eventId", type: { name: "string" }, modifiers: [] },
          { name: "eventDate", type: { name: "datetime" }, modifiers: [] },
        ],
        relationships: [
          {
            name: "event",
            kind: "belongsTo",
            target: "Event",
            foreignKey: {
              fields: ["tenantId", "eventId"],
              references: ["tenantId", "id"],
            },
          },
        ],
        commands: ["create"],
      },
    ],
    commands: [
      {
        name: "create",
        entity: "PlannedChild",
        parameters: [
          { name: "eventId", type: { name: "string" }, required: true },
          { name: "eventDate", type: { name: "datetime" }, required: true },
        ],
      },
    ],
  };

  it("flags a required parent-owned field with no override", () => {
    const violations = scanParentContextViolations(plantedIR, {});
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      child: "PlannedChild",
      parent: "Event",
      field: "eventDate",
      fkField: "eventId",
    });
  });

  it("does NOT flag the FK itself (eventId is expected linkage input)", () => {
    const violations = scanParentContextViolations(plantedIR, {});
    expect(
      violations.find((v: { field: string }) => v.field === "eventId")
    ).toBeUndefined();
  });

  it("a documented override silences the violation", () => {
    const violations = scanParentContextViolations(plantedIR, {
      PlannedChild: { fields: ["eventDate"] },
    });
    expect(violations).toEqual([]);
  });
});
