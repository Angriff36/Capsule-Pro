/**
 * WasteEntry + Shipment parent-context contract (Task 8.10).
 *
 * Proves at the command-contract level that creating a waste entry or a shipment
 * against an event does NOT make the caller re-supply the event-owned
 * `locationId`: each create command accepts only its own input + the eventId
 * link, while the entity declares `locationId` as a property that parent-context
 * propagation fills server-side (manifest/runtime/src/parent-context-resolver.ts).
 *
 * WHY this is a real test (not a tautology): it reads the COMPILED IR — the same
 * artifact the dispatcher resolves against — so if someone re-adds a `locationId`
 * param to WasteEntry.create / Shipment.create (forcing the form to re-enter the
 * event's location), or drops the belongsTo Event / snapshot wiring, this fails.
 * The runtime-level proof that the value is actually inherited lives in
 * manifest/runtime/src/__tests__/waste-shipment-parent-context-runtime.test.ts.
 *
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(
  here,
  "..",
  "..",
  "..",
  "..",
  "manifest",
  "ir",
  "kitchen.ir.json"
);
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const event = ir.entities.find((e: { name: string }) => e.name === "Event");

// locationId is event-owned context a child should inherit rather than ask for.
const PARENT_OWNED = "locationId";

function contractFor(entityName: string) {
  const entity = ir.entities.find(
    (e: { name: string }) => e.name === entityName
  );
  const createCmd = ir.commands.find(
    (c: { entity: string; name: string }) =>
      c.entity === entityName && c.name === "create"
  );
  return { entity, createCmd };
}

for (const entityName of ["WasteEntry", "Shipment"]) {
  describe(`${entityName} create — does not require the event-owned locationId`, () => {
    const { entity, createCmd } = contractFor(entityName);

    it("links to Event via belongsTo (so context is resolvable from eventId)", () => {
      const rel = entity.relationships.find(
        (r: { kind: string; target: string }) =>
          r.kind === "belongsTo" && r.target === "Event"
      );
      expect(rel).toBeDefined();
      expect(rel.foreignKey.fields).toContain("eventId");
    });

    it("accepts eventId as the parent linkage input", () => {
      const params = createCmd.parameters.map((p: { name: string }) => p.name);
      expect(params).toContain("eventId");
    });

    it("does NOT ask the caller for the event-owned locationId", () => {
      const params = new Set(
        createCmd.parameters.map((p: { name: string }) => p.name)
      );
      expect(params.has(PARENT_OWNED)).toBe(false);
    });

    it("declares locationId as a property (so the inherited value can be stored)", () => {
      const props = new Set(
        entity.properties.map((p: { name: string }) => p.name)
      );
      expect(props.has(PARENT_OWNED)).toBe(true);
    });

    it("the inherited locationId is genuinely Event-owned (the duplication it avoids)", () => {
      const eventProps = new Set(
        event.properties.map((p: { name: string }) => p.name)
      );
      expect(eventProps.has(PARENT_OWNED)).toBe(true);
    });
  });
}
