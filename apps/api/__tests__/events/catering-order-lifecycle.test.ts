/**
 * Functional Test: CateringOrder state-machine transitions
 *
 * Regression guard for a CRITICAL governed-logic bug (IMPLEMENTATION_PLAN 6th rev):
 *   The `transition` declarations referenced a phantom property `status`, but the
 *   entity's status property is named `orderStatus`. Because the runtime only
 *   enforces transitions on the property a `transition` names, the real
 *   `orderStatus` property had ZERO state-machine enforcement — illegal status
 *   jumps were silently allowed at the runtime layer.
 *
 *   The fix renames the four transitions to `orderStatus`. It also adds
 *   `cancelled` to the `delivered` transition targets, because the `cancel`
 *   command's guard explicitly permits cancelling a delivered order
 *   (`orderStatus != "completed" and orderStatus != "cancelled"`); without it,
 *   the now-enforced state machine would reject a legitimate cancel-after-deliver.
 *
 * Transitions are enforced by RuntimeEngine (@angriff36/manifest@2.2.0): an
 * illegal transition yields `{ success: false, error: "Invalid state
 * transition ..." }` with no emitted events.
 */

import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import {
  compileManifestSourceForTest,
  inMemoryStoreProvider,
} from "../test-helpers";

const MANIFEST_FILE = "events/catering-order-rules.manifest";

// The real source opens with `use "../_base.manifest"` and mixes TenantScoped /
// SoftDeletable; compiler 2.18.6 can't resolve `use` in a bare single-source
// compile, so the shared helper inlines `_base.manifest` first.
function compile() {
  return compileManifestSourceForTest(MANIFEST_FILE);
}

async function getRuntime() {
  const ir = await compile();
  return new ManifestRuntimeEngine(
    ir,
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

function draftOrderSeed() {
  return {
    id: "co-1",
    tenantId: "test-tenant-456",
    orderNumber: "CO-001",
    customerId: "cust-1",
    orderStatus: "draft",
    guestCount: 50,
  };
}

interface Transition {
  from: string;
  property: string;
  to: string[];
}

interface IrEntity {
  name: string;
  transitions?: Transition[];
}

async function cateringOrderEntity(): Promise<IrEntity> {
  const ir = await compile();
  const entity = (ir.entities as IrEntity[]).find(
    (e) => e.name === "CateringOrder"
  );
  if (!entity) {
    throw new Error("CateringOrder entity missing from compiled IR");
  }
  return entity;
}

describe("CateringOrder IR transitions", () => {
  it("declares all transitions on `orderStatus` (not the phantom `status`)", async () => {
    const entity = await cateringOrderEntity();

    const transitions: Transition[] = entity.transitions ?? [];
    expect(transitions.length).toBeGreaterThan(0);

    // Before the fix every transition.property was "status" (a property that does
    // not exist on CateringOrder), so the entity's real status field was never
    // governed by the state machine.
    for (const t of transitions) {
      expect(t.property).toBe("orderStatus");
    }
  });

  it("allows cancelling a delivered order (delivered -> cancelled in the graph)", async () => {
    const entity = await cateringOrderEntity();
    const transitions: Transition[] = entity.transitions ?? [];
    const fromDelivered = transitions.find((t) => t.from === "delivered");
    expect(fromDelivered).toBeDefined();
    expect(fromDelivered?.to).toContain("cancelled");
  });
});

describe("Manifest Runtime - CateringOrder lifecycle", () => {
  it("permits the full happy-path lifecycle through the enforced state machine", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("CateringOrder", draftOrderSeed());

    const confirm = await runtime.runCommand(
      "confirm",
      { userId: "u1" },
      { entityName: "CateringOrder", instanceId: "co-1" }
    );
    expect(confirm.success).toBe(true);

    const startPrep = await runtime.runCommand(
      "startPrep",
      { userId: "u1" },
      { entityName: "CateringOrder", instanceId: "co-1" }
    );
    expect(startPrep.success).toBe(true);

    const deliver = await runtime.runCommand(
      "deliver",
      { userId: "u1" },
      { entityName: "CateringOrder", instanceId: "co-1" }
    );
    expect(deliver.success).toBe(true);

    const complete = await runtime.runCommand(
      "markComplete",
      { userId: "u1" },
      { entityName: "CateringOrder", instanceId: "co-1" }
    );
    expect(complete.success).toBe(true);

    const instance = await runtime.getInstance("CateringOrder", "co-1");
    expect(instance?.orderStatus).toBe("completed");
  });

  it("permits cancelling a delivered order at runtime", async () => {
    const runtime = await getRuntime();
    await runtime.createInstance("CateringOrder", draftOrderSeed());

    for (const cmd of ["confirm", "startPrep", "deliver"]) {
      const r = await runtime.runCommand(
        cmd,
        { userId: "u1" },
        { entityName: "CateringOrder", instanceId: "co-1" }
      );
      expect(r.success).toBe(true);
    }

    const cancel = await runtime.runCommand(
      "cancel",
      { reason: "Customer cancelled after delivery dispute" },
      { entityName: "CateringOrder", instanceId: "co-1" }
    );
    // delivered -> cancelled must be a legal transition (matches the cancel guard).
    expect(cancel.success).toBe(true);
    const instance = await runtime.getInstance("CateringOrder", "co-1");
    expect(instance?.orderStatus).toBe("cancelled");
  });
});
