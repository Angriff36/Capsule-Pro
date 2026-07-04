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
import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

// Load the MERGED compiled IR (all entities, mixins resolved), the same artifact
// the runtime ships and the passing runtime middleware tests use. We deliberately
// do NOT compile vendor-contract-rules.manifest in isolation: single-file
// compileToIR cannot resolve `use "../_base.manifest"` (so the TenantScoped /
// SoftDeletable mixins are "unknown"), and the current compiler treats unset
// non-null create fields as fatal diagnostics — both null out `ir` for the
// per-file path, which has nothing to do with the lifecycle behavior under test.
const IR_PATH = join(process.cwd(), "../../manifest/ir/kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const mergedIr: any = JSON.parse(readFileSync(IR_PATH, "utf-8"));

// biome-ignore lint/suspicious/useAwait: async keeps `await getRuntime()` call sites valid.
async function getRuntime() {
  return new ManifestRuntimeEngine(
    mergedIr,
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
      {
        userId: "u1",
        breachType: "late_delivery",
        description: "Shipment late",
      },
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

  /**
   * Regression guard for the FSM transition-drift bug (2026-06-21):
   *   `approve` mutates `status = now() >= startDate ? "active" : "pending_activation"`,
   *   but the `pending_approval` transition edge listed only
   *   ["pending_activation", "rejected", "cancelled"] — NO "active". Since
   *   `startDate` defaults to now() and is normally current/backdated, the common
   *   "approve a contract that has already started" path produced an UNDECLARED
   *   pending_approval -> active transition, which the runtime FSM check silently
   *   rejects (the mutate is dropped). Only future-dated contracts could be
   *   approved. Fix: add "active" to the pending_approval edge list.
   *
   * WHY this matters: a vendor contract whose term has begun must become active on
   * approval in one step — not be stuck pending until a separate `activate` call.
   */
  function pendingApprovalSeed(startDateOffsetMs: number) {
    return {
      id: "vc-1",
      tenantId: "test-tenant-456",
      contractNumber: "VC-001",
      vendorId: "vendor-1",
      vendorName: "Acme Foods",
      contractType: "purchase",
      status: "pending_approval",
      startDate: Date.now() + startDateOffsetMs,
      endDate: Date.now() + 335 * DAY,
      autoRenew: false,
      paymentTerms: "NET_30",
    };
  }

  // `approve` carries an `approval contractApproval` block, so the engine gates
  // it: the first runCommand registers a pending request, the procurement stage
  // must be granted, then the command proceeds. (Seeds are < $50k so the finance
  // stage's `when` is false and only `procurement` is required.) This drives the
  // exact production path through the FSM transition under test.
  async function approveContract(
    runtime: Awaited<ReturnType<typeof getRuntime>>
  ) {
    const gated = await runtime.runCommand(
      "approve",
      { userId: "approver-1" },
      { entityName: "VendorContract", instanceId: "vc-1" }
    );
    // First call is gated, not executed — proves the approval workflow is live.
    expect(gated.success).toBe(false);

    await runtime.approveStage(
      "VendorContract",
      "vc-1",
      "contractApproval",
      "procurement",
      { id: "approver-1", role: "admin" }
    );

    return runtime.runCommand(
      "approve",
      { userId: "approver-1" },
      { entityName: "VendorContract", instanceId: "vc-1" }
    );
  }

  it("approve transitions an already-started contract to active (pending_approval -> active edge)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance(
      "VendorContract",
      pendingApprovalSeed(-30 * DAY)
    );

    const result = await approveContract(runtime);

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("VendorContract", "vc-1");
    // Before the fix, status stayed "pending_approval" — the mutate was silently
    // dropped because pending_approval -> active was an undeclared transition.
    expect(instance?.status).toBe("active");
    expect(instance?.approvedBy).toBe("approver-1");
  });

  it("approve transitions a future-dated contract to pending_activation (other ternary branch unaffected)", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance(
      "VendorContract",
      pendingApprovalSeed(30 * DAY)
    );

    const result = await approveContract(runtime);

    expect(result.success).toBe(true);
    const instance = await runtime.getInstance("VendorContract", "vc-1");
    expect(instance?.status).toBe("pending_activation");
  });
});
