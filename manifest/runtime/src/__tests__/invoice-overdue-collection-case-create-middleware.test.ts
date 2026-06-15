/**
 * Middleware conformance — `InvoiceMarkedOverdue → CollectionCase.create`
 * (IMPLEMENTATION_PLAN P1 "InvoiceMarkedOverdue → CollectionCase.create").
 *
 * WHY this matters (not just WHAT it does): when an invoice goes overdue it must
 * enter an AR-recovery workflow, otherwise the debt silently accumulates with no
 * collection case attached. `InvoiceMarkedOverdue` had ZERO consumers — the only way
 * to open a CollectionCase was the manual POST route. This middleware closes that
 * dead-end. It CANNOT be a reaction: `Invoice.markOverdue()` takes no params and is a
 * MUTATE, so the engine payload `{ ...commandInput, result }` carries only a timestamp
 * scalar; the fields a case needs (clientId/eventId/total/amountDue/invoiceNumber) are
 * the Invoice's OWN fields, and declared event fields are never auto-populated from
 * `self.*`. The middleware loads the Invoice via `_subject.id` and dispatches the
 * governed `CollectionCase.create`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation regresses — no case opened,
 * wrong amounts, or the engine stops dispatching create. It also regression-locks that
 * a `payload.result.*`-style reaction does not creep into the IR for this propagation.
 *
 * Chain proven here:
 *   Invoice.markOverdue()  (on a past-due SENT invoice)
 *     → emits InvoiceMarkedOverdue (_subject.id = the invoice id)
 *     → middleware loads the invoice, reads clientId/eventId/total/amountDue
 *     → dispatches CollectionCase.create(...) → a case row is persisted with the
 *       invoice's debt, ACTIVE/MEDIUM, deduped to one per invoice.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createInvoiceOverdueCollectionCaseCreateMiddleware } from "../middleware/invoice-overdue-collection-case-create-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-overdue-collection";
// admin satisfies Invoice.markOverdue's policy AND the middleware's
// CollectionCase.create dispatch policy so neither command is denied.
const USER = { id: "u-overdue", tenantId: TENANT, role: "admin" } as const;

const INVOICE_ID = "inv-overdue-001";
const CLIENT_ID = "client-overdue-1";
const EVENT_ID = "event-overdue-1";
const PAST_DUE = Date.now() - 40 * 24 * 60 * 60 * 1000;

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

/** Build the engine with the InvoiceOverdue→CollectionCase middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createInvoiceOverdueCollectionCaseCreateMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn diagnostics in tests */
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

async function seedInvoice(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("Invoice").create({
    id: INVOICE_ID,
    tenantId: TENANT,
    invoiceNumber: "INV-9001",
    invoiceType: "FINAL_PAYMENT",
    status: "SENT",
    clientId: CLIENT_ID,
    eventId: EVENT_ID,
    subtotal: 1000,
    taxAmount: 0,
    discountAmount: 0,
    total: 1000,
    amountPaid: 0,
    amountDue: 1000,
    paymentTerms: 30,
    // markOverdue guards `dueDate < now()`; seed it in the past.
    dueDate: PAST_DUE,
    metadata: "{}",
    lineItems: "[]",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedClient(provider: (entity: string) => Store) {
  await provider("Client").create({
    id: CLIENT_ID,
    tenantId: TENANT,
    businessName: "Delinquent Corp",
    deletedAt: null,
  } as never);
}

async function markOverdue(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Invoice",
      command: "markOverdue",
      body: { id: INVOICE_ID, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

async function casesForTenant(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  const all = (await provider("CollectionCase").getAll()) as Record<
    string,
    unknown
  >[];
  return all.filter((c) => c.tenantId === TENANT);
}

describe("Middleware conformance: InvoiceMarkedOverdue → CollectionCase.create", () => {
  it("the compiled IR carries no InvoiceMarkedOverdue → CollectionCase.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "InvoiceMarkedOverdue" &&
        r.targetEntity === "CollectionCase" &&
        r.targetCommand === "create"
    );
    // A regression here means someone added a reaction that cannot read the
    // invoice's own fields (clientId/total/...); the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("opens a collection case for a freshly-overdue invoice with the invoice's debt", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    await seedClient(provider);
    const engine = newEngine(provider);

    const result = await markOverdue(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware dispatched CollectionCase.create against the same
    // store, so a case now exists for the overdue invoice.
    const cases = await casesForTenant(provider);
    expect(cases).toHaveLength(1);
    const opened = cases[0];
    expect(opened.invoiceId).toBe(INVOICE_ID);
    expect(opened.invoiceNumber).toBe("INV-9001");
    expect(opened.clientId).toBe(CLIENT_ID);
    expect(opened.eventId).toBe(EVENT_ID);
    expect(Number(opened.originalAmount)).toBe(1000);
    expect(Number(opened.outstandingAmount)).toBe(1000);
    expect(opened.status).toBe("ACTIVE");
    expect(opened.priority).toBe("MEDIUM");
    // The human-readable client name was resolved from the Client store.
    expect(opened.clientName).toBe("Delinquent Corp");

    // Secondary proof: the parent command's own event is present (the chain ran).
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("InvoiceMarkedOverdue");
  });

  it("is idempotent — does not open a second case when one already exists for the invoice", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    // Pre-existing case for this invoice (e.g. opened manually via the route).
    await provider("CollectionCase").create({
      id: "case-pre-existing",
      tenantId: TENANT,
      invoiceId: INVOICE_ID,
      invoiceNumber: "INV-9001",
      eventId: EVENT_ID,
      clientId: CLIENT_ID,
      clientName: "Delinquent Corp",
      originalAmount: 1000,
      outstandingAmount: 1000,
      collectedAmount: 0,
      status: "ACTIVE",
      priority: "MEDIUM",
      dunningStage: "CURRENT",
      daysOverdue: 40,
      metadata: "{}",
      deletedAt: null,
    } as never);
    const engine = newEngine(provider);

    const result = await markOverdue(engine);
    expect(result.ok).toBe(true);

    const cases = await casesForTenant(provider);
    expect(cases).toHaveLength(1);
    expect(cases[0].id).toBe("case-pre-existing");
  });

  it("skips a zero-total invoice (would fail CollectionCase.amount_positive)", async () => {
    const provider = makeProvider();
    // A past-due SENT invoice with no balance — markOverdue still fires (it has no
    // amount guard), but a case with originalAmount 0 violates amount_positive.
    await seedInvoice(provider, { total: 0, subtotal: 0, amountDue: 0 });
    const engine = newEngine(provider);

    const result = await markOverdue(engine);
    // The invoice still transitions to OVERDUE; only the case creation is skipped.
    expect(result.ok).toBe(true);

    const cases = await casesForTenant(provider);
    expect(cases).toHaveLength(0);
  });
});
