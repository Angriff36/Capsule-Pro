/**
 * RevenueRecognitionSchedule parent-context contract (Task 8.10, 6th adopter).
 *
 * Proves at the command-contract level that creating a revenue-recognition
 * schedule from an invoice does NOT make the caller re-supply the invoice-owned
 * eventId/clientId: the create command accepts only the parent link (invoiceId) +
 * schedule-specific input, while the schedule declares the inherited fields
 * (eventId/clientId) that parent-context propagation fills server-side
 * (manifest/runtime/src/parent-context-resolver.ts).
 *
 * WHY this is a real test (not a tautology): it reads the COMPILED IR — the same
 * artifact the dispatcher resolves against — so if someone re-adds an
 * `eventId`/`clientId` param to RevenueRecognitionSchedule.create (forcing the
 * caller to re-enter facts the Invoice already owns), or drops the belongsTo
 * Invoice wiring, this fails. The runtime-level proof that the values are actually
 * inherited (and that the Invoice's own `metadata` does NOT bleed onto the
 * schedule) lives in
 * manifest/runtime/src/__tests__/revenue-recognition-parent-context-runtime.test.ts.
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

const invoice = ir.entities.find((e: { name: string }) => e.name === "Invoice");
const schedule = ir.entities.find(
  (e: { name: string }) => e.name === "RevenueRecognitionSchedule"
);
const createCmd = ir.commands.find(
  (c: { entity: string; name: string }) =>
    c.entity === "RevenueRecognitionSchedule" && c.name === "create"
);

// Invoice-owned facts the schedule should inherit rather than ask for.
const PARENT_OWNED = ["eventId", "clientId"] as const;

describe("RevenueRecognitionSchedule create — does not require invoice-owned eventId/clientId", () => {
  it("links to Invoice via belongsTo (so context is resolvable from invoiceId)", () => {
    const rel = schedule.relationships.find(
      (r: { kind: string; target: string }) =>
        r.kind === "belongsTo" && r.target === "Invoice"
    );
    expect(rel).toBeDefined();
    expect(rel.foreignKey.fields).toContain("invoiceId");
  });

  it("accepts invoiceId as the parent linkage input", () => {
    const params = createCmd.parameters.map((p: { name: string }) => p.name);
    expect(params).toContain("invoiceId");
  });

  it("does NOT ask the caller for the invoice-owned eventId/clientId", () => {
    const params = new Set(
      createCmd.parameters.map((p: { name: string }) => p.name)
    );
    const duplicated = PARENT_OWNED.filter((f) => params.has(f));
    expect(duplicated).toEqual([]);
  });

  it("declares the inherited fields it stores (so propagation has a target)", () => {
    const props = new Set(
      schedule.properties.map((p: { name: string }) => p.name)
    );
    for (const f of PARENT_OWNED) {
      expect(props.has(f)).toBe(true);
    }
  });

  it("the inherited fields are genuinely Invoice-owned (the duplication it avoids)", () => {
    const invoiceProps = new Set(
      invoice.properties.map((p: { name: string }) => p.name)
    );
    for (const f of PARENT_OWNED) {
      expect(invoiceProps.has(f)).toBe(true);
    }
  });

  it("KEEPS metadata as a create param to fence the resolver from inheriting Invoice.metadata", () => {
    // Invoice ALSO owns a `metadata` string. The schedule's metadata is its own;
    // it must stay a create param so the generic resolver excludes it from
    // inheritance (otherwise the invoice's metadata would silently bleed onto the
    // schedule). See the FALSE_POSITIVE entry in parent-context-overrides.json.
    const params = new Set(
      createCmd.parameters.map((p: { name: string }) => p.name)
    );
    expect(params.has("metadata")).toBe(true);
    const invoiceProps = new Set(
      invoice.properties.map((p: { name: string }) => p.name)
    );
    expect(invoiceProps.has("metadata")).toBe(true);
  });
});
