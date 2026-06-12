/**
 * BattleBoard parent-context contract.
 *
 * Proves at the API/command-contract level that creating a battle board from an
 * event does NOT make the caller re-supply event-owned data: the create command
 * accepts only board-specific input + the eventId link, while the board declares
 * the event-owned snapshot fields that parent-context propagation fills
 * server-side (manifest/runtime/src/parent-context-resolver.ts).
 *
 * WHY this is a real test (not a tautology): it reads the COMPILED IR — the same
 * artifact the dispatcher resolves against — so if someone adds e.g. a required
 * `eventDate` param to BattleBoard.create (forcing the form to ask for the
 * event's date again), or drops the belongsTo/snapshot wiring, this fails.
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
const board = ir.entities.find(
  (e: { name: string }) => e.name === "BattleBoard"
);
const createCmd = ir.commands.find(
  (c: { entity: string; name: string }) =>
    c.entity === "BattleBoard" && c.name === "create"
);

// Event-owned context a board should inherit rather than ask for.
const PARENT_OWNED = [
  "eventDate",
  "clientId",
  "guestCount",
  "venueName",
  "venueAddress",
  "locationId",
] as const;

describe("BattleBoard create — does not require event-owned input", () => {
  it("links to Event via belongsTo (so context is resolvable from eventId)", () => {
    const rel = board.relationships.find(
      (r: { kind: string; target: string }) =>
        r.kind === "belongsTo" && r.target === "Event"
    );
    expect(rel).toBeDefined();
    expect(rel.foreignKey.fields).toContain("eventId");
  });

  it("accepts eventId as the only parent linkage input", () => {
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
      board.properties.map((p: { name: string }) => p.name)
    );
    for (const f of PARENT_OWNED) {
      expect(props.has(f)).toBe(true);
    }
    expect(props.has("inheritedContext")).toBe(true);
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
