/**
 * CateringOrder parent-context contract (Task 8.10).
 *
 * Proves at the command-contract level that creating a catering order from an
 * event does NOT make the caller re-supply the event-owned venue: the create
 * command accepts only order-specific input + the eventId link, while the order
 * declares the event-owned snapshot fields (venueName/venueAddress) that
 * parent-context propagation fills server-side
 * (manifest/runtime/src/parent-context-resolver.ts).
 *
 * WHY this is a real test (not a tautology): it reads the COMPILED IR — the same
 * artifact the dispatcher resolves against — so if someone re-adds a
 * `venueName`/`venueAddress` param to CateringOrder.create (forcing the form to
 * re-enter the event's venue), or drops the belongsTo Event / snapshot wiring,
 * this fails. The runtime-level proof that the values are actually inherited
 * lives in
 * manifest/runtime/src/__tests__/catering-order-parent-context-runtime.test.ts.
 *
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "..", "manifest", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const event = ir.entities.find((e: { name: string }) => e.name === "Event");
const cateringOrder = ir.entities.find((e: { name: string }) => e.name === "CateringOrder");
const createCmd = ir.commands.find(
  (c: { entity: string; name: string }) => c.entity === "CateringOrder" && c.name === "create"
);

// Event-owned venue context a catering order should inherit rather than ask for.
// venueCity/venueState/venueZip/contact fields are intentionally NOT here: Event
// does not own those broken-out columns, so they stay order-specific create params.
const PARENT_OWNED = ["venueName", "venueAddress"] as const;

describe("CateringOrder create — does not require event-owned venue input", () => {
  it("links to Event via belongsTo (so context is resolvable from eventId)", () => {
    const rel = cateringOrder.relationships.find(
      (r: { kind: string; target: string }) => r.kind === "belongsTo" && r.target === "Event"
    );
    expect(rel).toBeDefined();
    expect(rel.foreignKey.fields).toContain("eventId");
  });

  it("accepts eventId as the parent linkage input", () => {
    const params = createCmd.parameters.map((p: { name: string }) => p.name);
    expect(params).toContain("eventId");
  });

  it("does NOT ask the caller for the event-owned venue fields", () => {
    const params = new Set(createCmd.parameters.map((p: { name: string }) => p.name));
    const duplicated = PARENT_OWNED.filter((f) => params.has(f));
    expect(duplicated).toEqual([]);
  });

  it("declares the event-owned snapshot fields it inherits (so they can be stored)", () => {
    const props = new Set(cateringOrder.properties.map((p: { name: string }) => p.name));
    for (const f of PARENT_OWNED) {
      expect(props.has(f)).toBe(true);
    }
  });

  it("the inherited fields are genuinely Event-owned (the duplication it avoids)", () => {
    const eventProps = new Set(event.properties.map((p: { name: string }) => p.name));
    for (const f of PARENT_OWNED) {
      expect(eventProps.has(f)).toBe(true);
    }
  });
});
