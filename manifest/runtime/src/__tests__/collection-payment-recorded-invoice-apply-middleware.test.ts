/**
 * Middleware conformance — `CollectionPaymentRecorded → Invoice.applyPayment`
 * (IMPLEMENTATION_PLAN P0 "Fix Collections→Invoice payment").
 *
 * WHY this matters (not just WHAT it does): recording a payment against a delinquent
 * collection case is supposed to credit the linked invoice so `amountPaid`/`amountDue`/
 * `status` track recovery reality. This was a SILENT NO-OP: the old
 * `on CollectionPaymentRecorded run Invoice.applyPayment` reaction read
 * `resolve payload.result.invoiceId`, but `CollectionCase.recordPayment` is a MUTATE
 * command, so the engine's emitted payload `{ ...commandInput, result }` carries
 * `result` = the last mutate's scalar (`lastActivityAt`), NOT the case instance.
 * `invoiceId` is the CollectionCase's OWN field and is NOT a `recordPayment` input
 * param, so NO reaction — even reading `payload.*` — can see it. The fix replaces the
 * dead reaction with middleware that LOADS the CollectionCase from the store via
 * `_subject.id`, reads `self.invoiceId`, and dispatches the governed
 * `Invoice.applyPayment`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation regresses — invoice not
 * credited, wrong amount, or the engine stops dispatching — i.e. it fails when the
 * BUSINESS propagation breaks, not on a shape change (CLAUDE.md Rule 9). It also
 * regression-locks that the broken reaction does not creep back into the IR.
 *
 * Chain proven here:
 *   CollectionCase.recordPayment(amount=A, paymentId, paymentDate)
 *     → emits CollectionPaymentRecorded (_subject.id = the case id)
 *     → middleware loads the case, reads invoiceId
 *     → dispatches Invoice.applyPayment(paymentAmount=A, paymentId)
 *     → the invoice's amountPaid/amountDue/status update, PaymentApplied bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createCollectionPaymentRecordedInvoiceApplyMiddleware } from "../middleware/collection-payment-recorded-invoice-apply-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-collection-invoice";
// admin satisfies CollectionCase.recordPayment's policy AND the middleware's
// Invoice.applyPayment dispatch policy so neither command is denied.
const USER = { id: "u-collection", tenantId: TENANT, role: "admin" } as const;

const CASE_ID = "case-001";
const INVOICE_ID = "inv-001";

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

/** Build the engine with the Collection→Invoice middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createCollectionPaymentRecordedInvoiceApplyMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      // Silence the default console.warn diagnostics in tests.
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

async function seedInvoice(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("Invoice").create({
    id: INVOICE_ID,
    tenantId: TENANT,
    invoiceNumber: "INV-0001",
    invoiceType: "FINAL_PAYMENT",
    status: "SENT",
    clientId: "client-1",
    eventId: "event-1",
    subtotal: 1000,
    taxAmount: 0,
    discountAmount: 0,
    total: 1000,
    amountPaid: 0,
    amountDue: 1000,
    paymentTerms: 30,
    dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    metadata: "{}",
    lineItems: "[]",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedCase(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed directly via the store so the test isolates the recordPayment → middleware
  // chain. Values satisfy CollectionCase's entity constraints (originalAmount > 0,
  // collectedAmount <= originalAmount) so recordPayment's mutate is not silently
  // dropped by constraint re-validation.
  await provider("CollectionCase").create({
    id: CASE_ID,
    tenantId: TENANT,
    invoiceId: INVOICE_ID,
    invoiceNumber: "INV-0001",
    eventId: "event-1",
    clientId: "client-1",
    clientName: "Acme Co",
    originalAmount: 1000,
    outstandingAmount: 1000,
    collectedAmount: 0,
    status: "ACTIVE",
    priority: "MEDIUM",
    dunningStage: "CURRENT",
    daysOverdue: 45,
    metadata: "{}",
    ...overrides,
  } as never);
}

async function recordPayment(
  engine: ManifestRuntimeEngine,
  amount = 250,
  paymentId = "pay-ref-1"
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "CollectionCase",
      command: "recordPayment",
      body: {
        id: CASE_ID,
        tenantId: TENANT,
        amount,
        paymentId,
        // datetime params are epoch ms in this runtime (ISO is rejected).
        paymentDate: Date.now(),
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: CollectionPaymentRecorded → Invoice.applyPayment", () => {
  it("the compiled IR no longer carries the broken Collection→Invoice reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "CollectionPaymentRecorded" &&
        r.targetEntity === "Invoice" &&
        r.targetCommand === "applyPayment"
    );
    // A regression here means someone re-added the dead `payload.result.*` reaction;
    // the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("recording a collection payment credits its linked invoice (amountPaid up, amountDue down, PARTIALLY_PAID)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    await seedCase(provider);
    const engine = newEngine(provider);

    const result = await recordPayment(engine, 250);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Invoice.applyPayment against the SAME store, so the
    // invoice now reflects the collection payment.
    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as Record<
      string,
      unknown
    >;
    expect(Number(invoice.amountPaid)).toBe(250);
    expect(Number(invoice.amountDue)).toBe(750);
    expect(invoice.status).toBe("PARTIALLY_PAID");

    // Secondary proof: the downstream command's own event bubbles up into the parent
    // command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("CollectionPaymentRecorded");
    expect(eventNames).toContain("PaymentApplied");
  });

  it("skips application when the invoice is still DRAFT (guard-safe no-op)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider, { status: "DRAFT" });
    await seedCase(provider);
    const engine = newEngine(provider);

    const result = await recordPayment(engine, 250);
    // The collection payment still records; only the invoice credit is skipped.
    expect(result.ok).toBe(true);

    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as Record<
      string,
      unknown
    >;
    expect(invoice.status).toBe("DRAFT");
    expect(Number(invoice.amountPaid)).toBe(0);
    expect(Number(invoice.amountDue)).toBe(1000);

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("CollectionPaymentRecorded");
    expect(eventNames).not.toContain("PaymentApplied");
  });

  it("skips application when the collection payment over-pays the invoice balance", async () => {
    const provider = makeProvider();
    // Invoice owes only 100, but the collection case allows a 250 payment.
    await seedInvoice(provider, { amountDue: 100, total: 100, subtotal: 100 });
    await seedCase(provider);
    const engine = newEngine(provider);

    const result = await recordPayment(engine, 250);
    expect(result.ok).toBe(true);

    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as Record<
      string,
      unknown
    >;
    // applyPayment guards `paymentAmount <= self.amountDue`; the middleware mirrors
    // that and skips rather than producing a swallowed guard failure.
    expect(Number(invoice.amountPaid)).toBe(0);
    expect(Number(invoice.amountDue)).toBe(100);
    expect(invoice.status).toBe("SENT");

    // But the collection case itself still recorded the payment (the case ledger
    // and the invoice diverge here by design — the route surfaces the mismatch).
    const collectionCase = (await provider("CollectionCase").getById(
      CASE_ID
    )) as Record<string, unknown>;
    expect(Number(collectionCase.collectedAmount)).toBe(250);
  });
});
