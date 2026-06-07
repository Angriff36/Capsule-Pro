/**
 * FacilityWorkOrder parent-context contract (Task 8.10, 7th adopter).
 *
 * Proves at the command-contract level that creating a facility work order from a
 * FacilityAsset does NOT make the caller re-supply the asset-owned facility/area:
 * the create command accepts only the assetId link + work-order-specific input,
 * while the work order declares the asset-owned snapshot fields (facilityId/areaId)
 * that parent-context propagation fills server-side
 * (manifest/runtime/src/parent-context-resolver.ts).
 *
 * WHY this is a real test (not a tautology): it reads the COMPILED IR — the same
 * artifact the dispatcher resolves against — so if someone re-adds a
 * `facilityId`/`areaId` param to FacilityWorkOrder.create (forcing the form to
 * re-enter the asset's facility/area), or drops the belongsTo FacilityAsset /
 * snapshot-property wiring, this fails. The runtime-level proof that the values are
 * actually inherited lives in
 * manifest/runtime/src/__tests__/facility-work-order-parent-context-runtime.test.ts.
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

const asset = ir.entities.find((e: { name: string }) => e.name === "FacilityAsset");
const workOrder = ir.entities.find((e: { name: string }) => e.name === "FacilityWorkOrder");
const createCmd = ir.commands.find(
  (c: { entity: string; name: string }) => c.entity === "FacilityWorkOrder" && c.name === "create"
);

// Asset-owned location context a work order should inherit rather than ask for.
// assetId is the parent linkage (kept as a param); facilityId/areaId flow from it.
const PARENT_OWNED = ["facilityId", "areaId"] as const;

describe("FacilityWorkOrder create — does not require asset-owned facility/area input", () => {
  it("links to FacilityAsset via belongsTo (so context is resolvable from assetId)", () => {
    const rel = workOrder.relationships.find(
      (r: { kind: string; target: string }) => r.kind === "belongsTo" && r.target === "FacilityAsset"
    );
    expect(rel).toBeDefined();
    expect(rel.foreignKey.fields).toContain("assetId");
  });

  it("accepts assetId as the parent linkage input", () => {
    const params = createCmd.parameters.map((p: { name: string }) => p.name);
    expect(params).toContain("assetId");
  });

  it("does NOT ask the caller for the asset-owned facility/area fields", () => {
    const params = new Set(createCmd.parameters.map((p: { name: string }) => p.name));
    const duplicated = PARENT_OWNED.filter((f) => params.has(f));
    expect(duplicated).toEqual([]);
  });

  it("declares the asset-owned snapshot fields it inherits (so they can be stored)", () => {
    const props = new Set(workOrder.properties.map((p: { name: string }) => p.name));
    for (const f of PARENT_OWNED) {
      expect(props.has(f)).toBe(true);
    }
  });

  it("the inherited fields are genuinely FacilityAsset-owned (the duplication it avoids)", () => {
    const assetProps = new Set(asset.properties.map((p: { name: string }) => p.name));
    for (const f of PARENT_OWNED) {
      expect(assetProps.has(f)).toBe(true);
    }
  });
});
