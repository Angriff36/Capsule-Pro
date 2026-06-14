/**
 * Middleware conformance — `EventCancelled → child-entity cascade cleanup`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle).
 *
 * WHY this matters (not just WHAT it does): before this, `EventCancelled` had
 * ZERO consumers. Cancelling an event left every downstream commitment live —
 * staff still rostered, catering orders open, prep lists active, draft/sent
 * invoices billable, collection cases chasing money for an event that will never
 * happen. Each had to be unwound by hand, and anything missed silently rotted
 * into bad labor/inventory/AR data. The cascade closes that: one governed
 * `Event.cancel` fans out to `EventStaff.unassign`, `CateringOrder.cancel`,
 * `PrepList.cancel`, `Invoice.voidInvoice`, and `CollectionCase.close` for every
 * child linked by `eventId`, and (via the prep-list-cancelled middleware that
 * the dispatched `PrepList.cancel` chains into) releases the inventory those prep
 * lists had reserved.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * cascade + reservation-release middleware wired (exactly as the factory wires
 * them), so it FAILS LOUDLY when the BUSINESS propagation regresses — a child
 * left un-cancelled, a paid invoice wrongly voided, the engine ceasing to
 * dispatch — not merely on a shape change (CLAUDE.md Rule 9; constitution §13).
 * It also regression-locks that nobody re-expresses this 1:N fan-out as a (dead)
 * IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventCancelledCascadeMiddleware } from "../middleware/event-cancelled-cascade-middleware.js";
import { createPrepListCancelledReleaseReservationMiddleware } from "../middleware/prep-list-cancelled-release-reservation-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-cancel";
// admin satisfies Event.cancel AND every dispatched leg's policy (CateringOrder
// cancel / Invoice void / CollectionCase close are role-restricted; admin ∈ all).
const USER = { id: "u-event-cancel", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "evt-cancel-001";

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

/** Engine wired with the cascade + reservation-release middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventCancelledCascadeMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
      },
    }),
    createPrepListCancelledReleaseReservationMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* no-op */
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

async function seedEvent(provider: (entity: string) => Store) {
  // Satisfy Event's entity-level block constraints (validTitle/validEventType/
  // positiveGuestCount/validStatus) so cancel's status mutate is not silently
  // dropped. status "confirmed" is a valid `from` for the ->cancelled transition.
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    title: "Smith Wedding",
    eventType: "wedding",
    eventDate: Date.now(),
    guestCount: 120,
    status: "confirmed",
    accessibilityOptions: [],
    tags: [],
  } as never);
}

function cancelEvent(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Event",
      command: "cancel",
      body: { id: EVENT_ID, tenantId: TENANT, reason: "Client cancelled" },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? [];
}

describe("Middleware conformance: EventCancelled → child cascade cleanup", () => {
  it("the compiled IR carries NO EventCancelled→X reaction (it is a 1:N middleware cascade)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) => r.event === "EventCancelled");
    // A regression here means someone tried to express this fan-out as reactions,
    // which structurally cannot resolve the many children — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("cancelling an event cancels every linked child and releases prep-list reservations", async () => {
    const provider = makeProvider();
    await seedEvent(provider);

    // One of each child, all linked to the event, all in a still-cancellable state.
    await provider("EventStaff").create({
      id: "es-1",
      tenantId: TENANT,
      eventId: EVENT_ID,
      staffMemberId: "staff-1",
      status: "assigned",
    } as never);
    await provider("CateringOrder").create({
      id: "co-1",
      tenantId: TENANT,
      eventId: EVENT_ID,
      orderNumber: "CO-1001",
      orderStatus: "confirmed",
      guestCount: 120,
      totalAmount: 5000,
    } as never);
    await provider("PrepList").create({
      id: "pl-1",
      tenantId: TENANT,
      eventId: EVENT_ID,
      name: "Wedding Prep",
      status: "finalized",
      batchMultiplier: 1,
      totalItems: 1,
      totalEstimatedTime: 0,
      isActive: true,
    } as never);
    await provider("Invoice").create({
      id: "inv-1",
      tenantId: TENANT,
      eventId: EVENT_ID,
      invoiceNumber: "INV-1001",
      invoiceType: "FINAL_PAYMENT",
      status: "SENT",
      clientId: "client-1",
      subtotal: 5000,
      taxAmount: 0,
      discountAmount: 0,
      total: 5000,
      amountPaid: 0,
      amountDue: 5000,
      paymentTerms: 30,
      dueDate: Date.now(),
      metadata: "{}",
    } as never);
    await provider("CollectionCase").create({
      id: "cc-1",
      tenantId: TENANT,
      eventId: EVENT_ID,
      invoiceId: "inv-old",
      invoiceNumber: "INV-OLD",
      clientId: "client-1",
      clientName: "Smith",
      originalAmount: 1000,
      outstandingAmount: 1000,
      collectedAmount: 0,
      status: "ACTIVE",
      priority: "MEDIUM",
      dunningStage: "CURRENT",
      daysOverdue: 5,
    } as never);

    // The prep list's reserved inventory (one item) — proves the release chain.
    await provider("PrepListItem").create({
      id: "pli-1",
      tenantId: TENANT,
      prepListId: "pl-1",
      stationId: "station-1",
      stationName: "Garde Manger",
      ingredientId: "inv-A",
      ingredientName: "Salmon",
      scaledQuantity: 10,
      scaledUnit: "kg",
    } as never);
    await provider("InventoryItem").create({
      id: "inv-A",
      tenantId: TENANT,
      item_number: "IN-A",
      name: "Salmon",
      category: "protein",
      unitOfMeasure: "kg",
      unitCost: 12,
      quantityOnHand: 100,
      quantityReserved: 10,
      parLevel: 0,
      reorder_level: 0,
    } as never);

    const engine = newEngine(provider);
    const result = await cancelEvent(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the cancelled event and every child moved to its terminal state.
    const evt = (await provider("Event").getById(EVENT_ID)) as Record<string, unknown>;
    const es = (await provider("EventStaff").getById("es-1")) as Record<string, unknown>;
    const co = (await provider("CateringOrder").getById("co-1")) as Record<string, unknown>;
    const pl = (await provider("PrepList").getById("pl-1")) as Record<string, unknown>;
    const inv = (await provider("Invoice").getById("inv-1")) as Record<string, unknown>;
    const cc = (await provider("CollectionCase").getById("cc-1")) as Record<string, unknown>;
    const item = (await provider("InventoryItem").getById("inv-A")) as Record<string, unknown>;

    expect(evt.status).toBe("cancelled");
    expect(es.status).toBe("unassigned");
    expect(co.orderStatus).toBe("cancelled");
    expect(pl.status).toBe("cancelled");
    expect(inv.status).toBe("VOID");
    expect(cc.status).toBe("RESOLVED");
    // The reservation held by the (now cancelled) prep list was released — the
    // PrepList.cancel the cascade dispatched chained into the release middleware.
    expect(Number(item.quantityReserved)).toBe(0);

    // Secondary proof: each leg's downstream event bubbled up — only possible if
    // the cascade actually dispatched the governed commands.
    const names = eventNames(result);
    expect(names).toContain("EventStaffUnassigned");
    expect(names).toContain("CateringOrderCancelled");
    expect(names).toContain("PrepListCancelled");
    expect(names).toContain("InvoiceVoided");
    expect(names).toContain("CollectionClosed");
    expect(names).toContain("InventoryReservationReleased");
  });

  it("never voids an invoice that carries a payment, and skips already-terminal children", async () => {
    const provider = makeProvider();
    await seedEvent(provider);

    // A fully-paid invoice and a partially-paid one MUST NOT be voided — they need
    // a refund/credit flow, not a void (voidInvoice guards amountPaid == 0).
    await provider("Invoice").create({
      id: "inv-paid",
      tenantId: TENANT,
      eventId: EVENT_ID,
      invoiceNumber: "INV-PAID",
      invoiceType: "FINAL_PAYMENT",
      status: "PAID",
      clientId: "c",
      subtotal: 100,
      taxAmount: 0,
      discountAmount: 0,
      total: 100,
      amountPaid: 100,
      amountDue: 0,
      paymentTerms: 30,
      dueDate: Date.now(),
      metadata: "{}",
    } as never);
    await provider("Invoice").create({
      id: "inv-partial",
      tenantId: TENANT,
      eventId: EVENT_ID,
      invoiceNumber: "INV-PARTIAL",
      invoiceType: "FINAL_PAYMENT",
      status: "SENT",
      clientId: "c",
      subtotal: 100,
      taxAmount: 0,
      discountAmount: 0,
      total: 100,
      amountPaid: 50,
      amountDue: 50,
      paymentTerms: 30,
      dueDate: Date.now(),
      metadata: "{}",
    } as never);
    // An unpaid SENT invoice IS voidable — the positive control.
    await provider("Invoice").create({
      id: "inv-open",
      tenantId: TENANT,
      eventId: EVENT_ID,
      invoiceNumber: "INV-OPEN",
      invoiceType: "FINAL_PAYMENT",
      status: "SENT",
      clientId: "c",
      subtotal: 100,
      taxAmount: 0,
      discountAmount: 0,
      total: 100,
      amountPaid: 0,
      amountDue: 100,
      paymentTerms: 30,
      dueDate: Date.now(),
      metadata: "{}",
    } as never);
    // An already-cancelled catering order is left untouched (idempotent skip).
    await provider("CateringOrder").create({
      id: "co-done",
      tenantId: TENANT,
      eventId: EVENT_ID,
      orderNumber: "CO-DONE",
      orderStatus: "cancelled",
      guestCount: 0,
      totalAmount: 0,
    } as never);

    const engine = newEngine(provider);
    const result = await cancelEvent(engine);
    expect(result.ok).toBe(true);

    const paid = (await provider("Invoice").getById("inv-paid")) as Record<string, unknown>;
    const partial = (await provider("Invoice").getById("inv-partial")) as Record<string, unknown>;
    const open = (await provider("Invoice").getById("inv-open")) as Record<string, unknown>;
    const co = (await provider("CateringOrder").getById("co-done")) as Record<string, unknown>;

    // Money-bearing invoices are protected; only the clean unpaid one is voided.
    expect(paid.status).toBe("PAID");
    expect(partial.status).toBe("SENT");
    expect(open.status).toBe("VOID");
    // Already-terminal child is a no-op, not a crash.
    expect(co.orderStatus).toBe("cancelled");
  });
});
