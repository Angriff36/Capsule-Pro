/**
 * Functional Test: VendorContract active-contract lifecycle
 *
 * Regression guard for a CRITICAL governed-logic bug (IMPLEMENTATION_PLAN 6th rev):
 *   The entity-level constraint `blockModifyActive:block self.status == "active"`
 *   fired on EVERY command whose resulting state is "active" — including the
 *   commands that are ONLY legal on an active contract (updateCompliance,
 *   recordSlaBreach, renew) and even `approve`/`activate` themselves (which set
 *   status to "active"). The net effect: an active vendor contract could never be
 *   created and never be operated on — the entire active-contract lifecycle was
 *   dead.
 *
 * WHY this lives at the runtime layer: entity-level block constraints are
 * evaluated by RuntimeEngine during createInstance and after command mutations.
 * Only a real RuntimeEngine roundtrip exercises the constraint; an HTTP-mock
 * test cannot.
 *
 * The intended protection ("don't edit the TERMS of an active contract") is
 * preserved independently by `command update`'s `guard self.status == "draft"`,
 * which this test also pins so the fix doesn't silently open up term editing.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-runtime/ir-contract";
import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

async function getRuntime() {
  const manifestPath = join(
    process.cwd(),
    "../../manifest/source",
    "procurement/vendor-contract-rules.manifest"
  );
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile vendor-contract-rules.manifest: ${diagnostics
        .map((d: { message: string }) => d.message)
        .join(", ")}`
    );
  }

  return new ManifestRuntimeEngine(
    enforceCommandOwnership(ir),
    {
      tenantId: "test-tenant-456",
      user: { id: "test-user-123", tenantId: "test-tenant-456", role: "admin" },
    },
    {
      storeProvider: inMemoryStoreProvider(),
      customBuiltins: createCustomBuiltins(),
    }
  );
}

const DAY = 86_400_000;

function activeContractSeed() {
  return {
    id: "vc-1",
    tenantId: "test-tenant-456",
    contractNumber: "VC-001",
    vendorId: "vendor-1",
    vendorName: "Acme Foods",
    contractType: "purchase",
    status: "active",
    startDate: Date.now() - 30 * DAY,
    endDate: Date.now() + 335 * DAY,
    autoRenew: true,
    paymentTerms: "NET_30",
  };
}

describe("Manifest Runtime - VendorContract active lifecycle", () => {
  it("can create an active contract (blockModifyActive must not fire on creation)", async () => {
    const runtime = await getRuntime();
    const seeded = await runtime.createInstance(
      "VendorContract",
      activeContractSeed()
    );
    // Before the fix, the entity-level block constraint fires during
    // createInstance because self.status == "active", returning undefined.
    expect(seeded).toBeDefined();
  });

  it("allows updateCompliance on an active contract", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("VendorContract", activeContractSeed());

    const result = await runtime.runCommand(
      "updateCompliance",
      {
        userId: "u1",
        complianceScore: 95,
        slaBreachCount: 0,
        onTimeDeliveryRate: 98,
        qualityRating: 4.5,
      },
      { entityName: "VendorContract", instanceId: "vc-1" }
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const instance = await runtime.getInstance("VendorContract", "vc-1");
    expect(instance?.complianceScore).toBe(95);
  });

  it("allows recordSlaBreach on an active contract", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("VendorContract", activeContractSeed());

    const result = await runtime.runCommand(
      "recordSlaBreach",
      { userId: "u1", breachType: "late_delivery", description: "Shipment late" },
      { entityName: "VendorContract", instanceId: "vc-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("VendorContract", "vc-1");
    expect(instance?.slaBreachCount).toBe(1);
  });

  it("allows renew on an active auto-renew contract", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("VendorContract", activeContractSeed());

    const result = await runtime.runCommand(
      "renew",
      { userId: "u1", newEndDate: Date.now() + 700 * DAY },
      { entityName: "VendorContract", instanceId: "vc-1" }
    );

    expect(result.success).toBe(true);
  });

  it("allows terminate on an active contract", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("VendorContract", activeContractSeed());

    const result = await runtime.runCommand(
      "terminate",
      { userId: "u1", reason: "Vendor insolvency" },
      { entityName: "VendorContract", instanceId: "vc-1" }
    );

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("VendorContract", "vc-1");
    expect(instance?.status).toBe("terminated");
  });

  it("still blocks editing TERMS of an active contract (update guard preserved)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("VendorContract", activeContractSeed());

    const result = await runtime.runCommand(
      "update",
      {
        endDate: Date.now() + 999 * DAY,
        autoRenew: false,
        renewalTermDays: 30,
        paymentTerms: "NET_60",
        deliveryTerms: "FOB",
        minimumOrderQuantity: 5,
        annualSpendCommitment: 1000,
        contractUrl: "",
        notes: "",
      },
      { entityName: "VendorContract", instanceId: "vc-1" }
    );

    // The `update` command guards `self.status == "draft"`, so editing the terms
    // of an active contract is still rejected — the real intent of the removed
    // entity-level constraint is preserved by this guard.
    expect(result.success).toBe(false);
  });
});
