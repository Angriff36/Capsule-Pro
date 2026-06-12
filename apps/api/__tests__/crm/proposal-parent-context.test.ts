/**
 * Proposal parent-context contract (Task 8.10).
 *
 * Proves at the command-contract level that creating a proposal from an event
 * does NOT make the caller re-supply event-owned data: the create command
 * accepts only proposal-specific input + the eventId link, while the proposal
 * declares the event-owned snapshot fields that parent-context propagation fills
 * server-side (manifest/runtime/src/parent-context-resolver.ts).
 *
 * WHY this is a real test (not a tautology): it reads the COMPILED IR — the same
 * artifact the dispatcher resolves against — so if someone re-adds e.g. a
 * `venueName`/`clientId` param to Proposal.create (forcing the form to re-enter
 * the event's client/venue), or drops the belongsTo Event / snapshot wiring,
 * this fails. The runtime-level proof that the values are actually inherited
 * lives in manifest/runtime/src/__tests__/proposal-parent-context-runtime.test.ts.
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
const proposal = ir.entities.find(
  (e: { name: string }) => e.name === "Proposal"
);
const createCmd = ir.commands.find(
  (c: { entity: string; name: string }) =>
    c.entity === "Proposal" && c.name === "create"
);

// Event-owned context a proposal should inherit rather than ask for. (guestCount
// is intentionally NOT here: a quote may target a different headcount than the
// event estimate, so it stays a proposal-specific create param.)
const PARENT_OWNED = [
  "clientId",
  "eventDate",
  "eventType",
  "venueName",
  "venueAddress",
] as const;

describe("Proposal create — does not require event-owned input", () => {
  it("links to Event via belongsTo (so context is resolvable from eventId)", () => {
    const rel = proposal.relationships.find(
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

  it("does NOT ask the caller for any event-owned field", () => {
    const params = new Set(
      createCmd.parameters.map((p: { name: string }) => p.name)
    );
    const duplicated = PARENT_OWNED.filter((f) => params.has(f));
    expect(duplicated).toEqual([]);
  });

  it("declares the event-owned snapshot fields it inherits (so they can be stored)", () => {
    const props = new Set(
      proposal.properties.map((p: { name: string }) => p.name)
    );
    for (const f of PARENT_OWNED) {
      expect(props.has(f)).toBe(true);
    }
  });

  it("the inherited fields are genuinely Event-owned (the duplication it avoids)", () => {
    const eventProps = new Set(
      event.properties.map((p: { name: string }) => p.name)
    );
    for (const f of PARENT_OWNED) {
      expect(eventProps.has(f)).toBe(true);
    }
  });
});
