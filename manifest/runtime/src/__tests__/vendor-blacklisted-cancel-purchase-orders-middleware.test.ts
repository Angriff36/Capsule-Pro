/**
 * Middleware conformance — `VendorBlacklisted → cancel the vendor's open PurchaseOrders`
 * (IMPLEMENTATION_PLAN: procurement orphan-event mop-up).
 *
 * WHY this matters (not just WHAT it does): before this, `VendorBlacklisted` had ZERO
 * consumers. Blacklisting a vendor for cause (fraud / food-safety / chronic non-delivery)
 * permanently bans them — `status = "blacklisted"` is terminal (no transition out;
 * `approve` guards against it) — yet every open PurchaseOrder still pointing at that
 * vendor stayed live and would continue to be ordered, received, and paid. The cascade
 * closes that financial-integrity hole: one governed `Vendor.blacklist` fans out to
 * `PurchaseOrder.cancel` for every still-cancellable PO linked by `vendorId`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the cascade
 * middleware wired (exactly as the factory wires it), so it FAILS LOUDLY when the BUSINESS
 * propagation regresses — an open PO left un-cancelled, a terminal PO wrongly touched, a
 * suspended vendor's POs wrongly cancelled, the engine ceasing to dispatch — not merely on
 * a shape change (CLAUDE.md Rule 9; constitution §13). It also regression-locks that nobody
 * re-expresses this 1:N fan-out as a (dead) IR reaction, and that the cascade is scoped to
 * the PERMANENT blacklist, never the reversible suspend.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createVendorBlacklistedCancelPurchaseOrdersMiddleware } from "../middleware/vendor-blacklisted-cancel-purchase-orders-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-vendor-blacklist";
// admin satisfies Vendor.blacklist AND PurchaseOrder.cancel policies (both
// procurement_manager/manager/admin) — the natural, aligned actor.
const USER = { id: "u-procurement", tenantId: TENANT, role: "admin" } as const;

const VENDOR_ID = "vendor-001";

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

/** Engine wired with the vendor-blacklist cascade middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createVendorBlacklistedCancelPurchaseOrdersMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
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
      now: () => Date.now(),
    }
  );
  return engine;
}

async function seedVendor(
  provider: (entity: string) => Store,
  id = VENDOR_ID,
  status = "active"
) {
  // Satisfy Vendor's entity-level constraints (validType/validStatus/validPaymentTerms)
  // so blacklist's status mutate is not silently dropped on persist.
  await provider("Vendor").create({
    id,
    tenantId: TENANT,
    name: "Acme Foods",
    type: "supplier",
    status,
    paymentTerms: "net30",
    rating: 0,
    ratingCount: 0,
  } as never);
}

let poSeq = 0;
async function seedPurchaseOrder(
  provider: (entity: string) => Store,
  overrides: { id: string; status: string; vendorId?: string; deletedAt?: number }
) {
  poSeq += 1;
  await provider("PurchaseOrder").create({
    id: overrides.id,
    tenantId: TENANT,
    poNumber: `PO-${poSeq.toString().padStart(4, "0")}`,
    vendorId: overrides.vendorId ?? VENDOR_ID,
    locationId: "loc-1",
    orderDate: Date.now(),
    status: overrides.status,
    subtotal: 100,
    taxAmount: 0,
    shippingAmount: 0,
    total: 100,
    itemCount: 1,
    ...(overrides.deletedAt != null ? { deletedAt: overrides.deletedAt } : {}),
  } as never);
}

function blacklistVendor(engine: ManifestRuntimeEngine, vendorId = VENDOR_ID) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Vendor",
      command: "blacklist",
      body: {
        id: vendorId,
        tenantId: TENANT,
        blacklistedBy: USER.id,
        reason: "Fraudulent invoicing",
      },
      user: { ...USER },
    }
  );
}

function suspendVendor(engine: ManifestRuntimeEngine, vendorId = VENDOR_ID) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Vendor",
      command: "suspend",
      body: {
        id: vendorId,
        tenantId: TENANT,
        suspendedBy: USER.id,
        reason: "Temporary quality hold",
      },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? [];
}

async function statusOf(
  provider: (entity: string) => Store,
  id: string
): Promise<unknown> {
  const row = (await provider("PurchaseOrder").getById(id)) as Record<string, unknown>;
  return row?.status;
}

describe("Middleware conformance: VendorBlacklisted → cancel open PurchaseOrders", () => {
  it("the compiled IR carries NO VendorBlacklisted→X reaction (it is a 1:N middleware cascade)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) => r.event === "VendorBlacklisted");
    // A regression here means someone tried to express this fan-out as a reaction,
    // which structurally cannot resolve the many open POs — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("blacklisting a vendor cancels every open PO across all cancellable states, leaving other vendors' POs alone", async () => {
    const provider = makeProvider();
    await seedVendor(provider);
    // One PO in each status that is a valid `from` for `-> cancelled`.
    await seedPurchaseOrder(provider, { id: "po-draft", status: "draft" });
    await seedPurchaseOrder(provider, { id: "po-submitted", status: "submitted" });
    await seedPurchaseOrder(provider, { id: "po-approved", status: "approved" });
    await seedPurchaseOrder(provider, { id: "po-ordered", status: "ordered" });
    await seedPurchaseOrder(provider, {
      id: "po-partial",
      status: "partially_received",
    });
    // A different vendor's PO MUST NOT be touched (the negative control).
    await seedPurchaseOrder(provider, {
      id: "po-other",
      status: "draft",
      vendorId: "vendor-999",
    });

    const engine = newEngine(provider);
    const result = await blacklistVendor(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: every open PO for the blacklisted vendor is now cancelled.
    expect(await statusOf(provider, "po-draft")).toBe("cancelled");
    expect(await statusOf(provider, "po-submitted")).toBe("cancelled");
    expect(await statusOf(provider, "po-approved")).toBe("cancelled");
    expect(await statusOf(provider, "po-ordered")).toBe("cancelled");
    expect(await statusOf(provider, "po-partial")).toBe("cancelled");
    // The unrelated vendor's PO is untouched.
    expect(await statusOf(provider, "po-other")).toBe("draft");

    // The vendor itself reached the terminal banned state.
    const vendor = (await provider("Vendor").getById(VENDOR_ID)) as Record<
      string,
      unknown
    >;
    expect(vendor.status).toBe("blacklisted");

    // Secondary proof: PurchaseOrderCancelled bubbled up — only possible if the
    // cascade actually dispatched the governed cancel command (5 open POs).
    const names = eventNames(result);
    expect(names).toContain("VendorBlacklisted");
    expect(names.filter((n) => n === "PurchaseOrderCancelled")).toHaveLength(5);
  });

  it("never touches terminal or soft-deleted POs (guard- and transition-safe)", async () => {
    const provider = makeProvider();
    await seedVendor(provider);
    // received / cancelled / rejected are terminal (rejected has NO ->cancelled
    // transition); a soft-deleted draft is logically gone. All must be skipped.
    await seedPurchaseOrder(provider, { id: "po-received", status: "received" });
    await seedPurchaseOrder(provider, { id: "po-cancelled", status: "cancelled" });
    await seedPurchaseOrder(provider, { id: "po-rejected", status: "rejected" });
    await seedPurchaseOrder(provider, {
      id: "po-deleted",
      status: "draft",
      deletedAt: Date.now(),
    });
    // One genuinely-open PO proves the cascade still ran (positive control).
    await seedPurchaseOrder(provider, { id: "po-open", status: "ordered" });

    const engine = newEngine(provider);
    const result = await blacklistVendor(engine);
    expect(result.ok).toBe(true);

    expect(await statusOf(provider, "po-received")).toBe("received");
    expect(await statusOf(provider, "po-cancelled")).toBe("cancelled");
    expect(await statusOf(provider, "po-rejected")).toBe("rejected");
    expect(await statusOf(provider, "po-deleted")).toBe("draft");
    // Only the genuinely-open one was cancelled.
    expect(await statusOf(provider, "po-open")).toBe("cancelled");
    expect(
      eventNames(result).filter((n) => n === "PurchaseOrderCancelled")
    ).toHaveLength(1);
  });

  it("SUSPENDING a vendor does NOT cancel its POs (cascade is scoped to the permanent blacklist)", async () => {
    const provider = makeProvider();
    await seedVendor(provider);
    await seedPurchaseOrder(provider, { id: "po-suspend", status: "ordered" });

    const engine = newEngine(provider);
    const result = await suspendVendor(engine);
    expect(result.ok).toBe(true);

    // Suspension is reversible (approve: inactive->active), so its in-flight POs stay
    // live — the middleware is event-name scoped to VendorBlacklisted only.
    expect(await statusOf(provider, "po-suspend")).toBe("ordered");
    const vendor = (await provider("Vendor").getById(VENDOR_ID)) as Record<
      string,
      unknown
    >;
    expect(vendor.status).toBe("inactive");
    expect(eventNames(result)).not.toContain("PurchaseOrderCancelled");
  });
});
