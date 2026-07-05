/**
 * Middleware conformance — FacilityWorkOrder lifecycle → FacilityAsset maintenance status
 * (IMPLEMENTATION_PLAN P1, Operations & logistics / Facilities).
 *
 * WHY this matters (not just WHAT it does): opening a maintenance work order against a
 * facility asset means that asset is being worked on and must stop reading as operational /
 * bookable; completing the work must bring it back. Both `FacilityWorkOrderCreated` and
 * `FacilityWorkOrderCompleted` had ZERO consumers, so the asset's status silently diverged
 * from its real availability. This is the facility-side mirror of the already-shipped
 * Equipment maintenance legs (open ⇒ maintenance, complete ⇒ operational).
 *
 * WHY middleware and not a reaction: the COMPLETED leg's `assetId` is the work order's OWN
 * field, not a `complete` param (declared event fields are never auto-populated from self.*),
 * so no reaction can read it; the CREATED leg needs guard-safety (`sendToMaintenance` guards
 * `self.status == "operational"`) — the middleware loads the asset first and skips cleanly
 * instead of relying on the engine swallowing an FSM-guard failure. It is a pure runtime
 * addition (no IR change), keeping the schema/route/reaction-payload gates untouched.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation regresses (CLAUDE.md Rule 9; constitution
 * §13), and regression-locks that nobody re-expresses this as an IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createFacilityWorkOrderAssetStatusMiddleware } from "../middleware/facility-work-order-asset-status-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-facility-wo";
// admin satisfies FacilityWorkOrder AND FacilityAsset policies.
const USER = { id: "u-facility-wo", tenantId: TENANT, role: "admin" } as const;

const ASSET = "asset-A";
const FIXED_NOW = 1_700_000_000_000;

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async clear(): Promise<void> {
    this.items.clear();
  }
}

function makeProvider(): (entity: string) => Store {
  const stores = new Map<string, Mem>();
  return (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

/** Build the engine with the facility-asset-status middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createFacilityWorkOrderAssetStatusMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* no-op in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      middleware,
      generateId: () => randomUUID(),
      now: () => FIXED_NOW,
    }
  );
  return engine;
}

async function seedAsset(provider: (entity: string) => Store, status: string) {
  // Seed every entity-level block constraint (validAssetType / validStatus) so the
  // sendToMaintenance/returnFromMaintenance updateInstance re-validation does not silently
  // drop the status mutate.
  await provider("FacilityAsset").create({
    id: ASSET,
    tenantId: TENANT,
    facilityId: "fac-1",
    areaId: "area-1",
    name: "Walk-in Cooler",
    assetType: "equipment",
    status,
    purchaseCost: 0,
    currentValue: 0,
  } as never);
}

/** Seed a work order row directly (skips the create open-leg) at a given status. */
async function seedWorkOrder(
  provider: (entity: string) => Store,
  id: string,
  status: string,
  assetId: string = ASSET
) {
  await provider("FacilityWorkOrder").create({
    id,
    tenantId: TENANT,
    facilityId: "fac-1",
    areaId: "area-1",
    assetId,
    title: "Compressor service",
    description: "",
    priority: "medium",
    status,
    category: "repair",
    requestedBy: "",
    assignedTo: "u-tech",
    estimatedCost: 0,
    actualCost: 0,
    notes: "",
  } as never);
}

async function createWorkOrder(
  engine: ManifestRuntimeEngine,
  overrides: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "FacilityWorkOrder",
      command: "create",
      body: {
        tenantId: TENANT,
        assetId: ASSET,
        title: "Compressor service",
        description: "",
        priority: "medium",
        category: "repair",
        requestedBy: "",
        estimatedCost: 0,
        scheduledDate: new Date(FIXED_NOW).toISOString(),
        notes: "",
        ...overrides,
      },
      user: { ...USER },
    }
  );
}

async function runCommand(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "FacilityWorkOrder",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

function eventNamesOf(result: { ok: boolean; events?: unknown }): string[] {
  return (result.ok ? (result.events as unknown[]) : [])?.map(
    // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
    (e: any) => e?.name as string
  );
}

async function statusOf(provider: (entity: string) => Store): Promise<unknown> {
  const asset = (await provider("FacilityAsset").getById(ASSET)) as Record<
    string,
    unknown
  >;
  return asset.status;
}

describe("Middleware conformance: FacilityWorkOrder lifecycle → FacilityAsset status", () => {
  it("the compiled IR carries NO FacilityWorkOrder → FacilityAsset reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        (r.event === "FacilityWorkOrderCreated" ||
          r.event === "FacilityWorkOrderCompleted") &&
        r.targetEntity === "FacilityAsset"
    );
    // A regression here means someone wired this as a (guard-unsafe) reaction; the
    // propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("opening a work order takes an operational asset into maintenance", async () => {
    const provider = makeProvider();
    await seedAsset(provider, "operational");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran FacilityAsset.sendToMaintenance against the SAME store,
    // so the asset is now in maintenance — which nothing did before this leg existed.
    expect(await statusOf(provider)).toBe("maintenance");

    const names = eventNamesOf(result);
    expect(names).toContain("FacilityWorkOrderCreated");
    expect(names).toContain("FacilityAssetSentToMaintenance");
  });

  it("completing a work order returns its asset to service (full open→complete cycle)", async () => {
    const provider = makeProvider();
    await seedAsset(provider, "operational");
    const engine = newEngine(provider);

    // create ⇒ asset goes to maintenance (open leg)
    const created = await createWorkOrder(engine);
    expect(created.ok).toBe(true);
    const workOrderId = (
      created.ok ? (created.events as { subject?: { id?: string } }[]) : []
    )
      .map((e) => e.subject?.id)
      .find(Boolean) as string;
    expect(workOrderId).toBeTruthy();
    expect(await statusOf(provider)).toBe("maintenance");

    // start ⇒ in_progress (no asset-status leg)
    const started = await runCommand(engine, "start", {
      id: workOrderId,
      userId: USER.id,
    });
    expect(started.ok).toBe(true);

    // complete ⇒ asset returns to operational (complete leg)
    const completed = await runCommand(engine, "complete", {
      id: workOrderId,
      actualCost: 0,
      completionNotes: "Serviced",
    });
    expect(completed.ok).toBe(true);
    expect(await statusOf(provider)).toBe("operational");

    const names = eventNamesOf(completed);
    expect(names).toContain("FacilityWorkOrderCompleted");
    expect(names).toContain("FacilityAssetReturnedFromMaintenance");
  });

  it("skips an asset already in maintenance (guard-safe no-op, no swallowed failure)", async () => {
    const provider = makeProvider();
    await seedAsset(provider, "maintenance");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine);
    // The work order still opens; only the status change is skipped.
    expect(result.ok).toBe(true);
    expect(await statusOf(provider)).toBe("maintenance");

    const names = eventNamesOf(result);
    expect(names).toContain("FacilityWorkOrderCreated");
    expect(names).not.toContain("FacilityAssetSentToMaintenance");
  });

  it("skips when the work order carries no assetId", async () => {
    const provider = makeProvider();
    await seedAsset(provider, "operational");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine, { assetId: "" });
    expect(result.ok).toBe(true);
    // Asset untouched; the work order still opens (guard-safe).
    expect(await statusOf(provider)).toBe("operational");
    expect(eventNamesOf(result)).not.toContain(
      "FacilityAssetSentToMaintenance"
    );
  });

  it("completing a work order whose asset is operational is a clean no-op", async () => {
    const provider = makeProvider();
    await seedAsset(provider, "operational");
    // Seed the work order directly at in_progress so the open leg never ran (asset stays
    // operational), then complete it — the complete leg must skip rather than fail.
    const WO = "wo-direct";
    await seedWorkOrder(provider, WO, "in_progress");
    const engine = newEngine(provider);

    const completed = await runCommand(engine, "complete", {
      id: WO,
      actualCost: 0,
      completionNotes: "Serviced",
    });
    expect(completed.ok).toBe(true);
    expect(await statusOf(provider)).toBe("operational");
    expect(eventNamesOf(completed)).not.toContain(
      "FacilityAssetReturnedFromMaintenance"
    );
  });
});
