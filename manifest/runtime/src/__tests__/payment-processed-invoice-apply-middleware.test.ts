/**
 * Middleware conformance — `PaymentProcessed → Invoice.applyPayment` (IMPLEMENTATION_PLAN P0 #1/#2).
 *
 * WHY this matters (not just WHAT it does): processing a payment is supposed to credit its
 * linked invoice so `amountPaid`/`amountDue`/`status` track payment reality. This was a SILENT
 * NO-OP: the old `on PaymentProcessed run Invoice.applyPayment` reaction read
 * `payload.result.invoiceId`/`payload.result.amount`, but `Payment.process` is a MUTATE command,
 * so the engine's emitted payload `{ ...commandInput, result }` carries `result` = the last
 * mutate's scalar (`gatewayTransactionId`), NOT the Payment instance. `invoiceId`/`amount` are
 * the Payment's OWN fields and are NOT `process` input params, so NO reaction — even reading
 * `payload.*` — can see them. The fix replaces the dead reaction with middleware that LOADS the
 * processed Payment from the store and dispatches the governed `Invoice.applyPayment`, and removes
 * the dormant `ProcessInvoicePayment` saga so the two can never double-apply.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware wired,
 * so it FAILS LOUDLY if the propagation regresses — invoice not credited, wrong amount, or the
 * engine stops dispatching — i.e. it fails when the BUSINESS propagation breaks, not on a shape
 * change (CLAUDE.md Rule 9; constitution §13). It also regression-locks that neither the broken
 * reaction nor the conflicting saga creeps back into the IR.
 *
 * Chain proven here:
 *   Payment.process(gatewayTransactionId=G)
 *     → emits PaymentProcessed (_subject.id = the Payment id)
 *     → middleware loads the Payment, reads invoiceId/amount
 *     → dispatches Invoice.applyPayment(paymentAmount=amount, paymentId)
 *     → the invoice's amountPaid/amountDue/status update, PaymentApplied bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPaymentProcessedInvoiceApplyMiddleware } from "../middleware/payment-processed-invoice-apply-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-pay-invoice";
// admin satisfies Payment.process's policy AND the middleware's Invoice.applyPayment
// dispatch policy so neither the source command nor the downstream is denied.
const USER = { id: "u-pay-invoice", tenantId: TENANT, role: "admin" } as const;

const PAYMENT_ID = "pay-001";
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

/** Build the engine with the Payment→Invoice middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPaymentProcessedInvoiceApplyMiddleware({
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

async function seedPayment(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed directly via the store so the test isolates the process → middleware chain.
  // `process` guards `self.status == "PENDING" or "PROCESSING"`.
  await provider("Payment").create({
    id: PAYMENT_ID,
    tenantId: TENANT,
    amount: 250,
    currency: "USD",
    status: "PENDING",
    methodType: "CREDIT_CARD",
    invoiceId: INVOICE_ID,
    eventId: "event-1",
    clientId: "client-1",
    gatewayTransactionId: "",
    fraudStatus: "NOT_CHECKED",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function processPayment(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Payment",
      command: "process",
      body: {
        id: PAYMENT_ID,
        tenantId: TENANT,
        gatewayTransactionId: "txn-abc",
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: PaymentProcessed → Invoice.applyPayment", () => {
  it("the compiled IR no longer carries the broken Payment→Invoice reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "PaymentProcessed" &&
        r.targetEntity === "Invoice" &&
        r.targetCommand === "applyPayment"
    );
    // A regression here means someone re-added the dead `payload.result.*` reaction;
    // the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("the compiled IR no longer carries the conflicting ProcessInvoicePayment saga", () => {
    const sagas: Record<string, unknown>[] = ir.sagas ?? [];
    const conflicting = sagas.filter((s) => s.name === "ProcessInvoicePayment");
    // The saga + middleware would double-apply on every PaymentProcessed; the saga
    // was removed so only the middleware owns the path.
    expect(conflicting).toHaveLength(0);
  });

  it("processing a payment credits its linked invoice (amountPaid up, amountDue down, PARTIALLY_PAID)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    await seedPayment(provider);
    const engine = newEngine(provider);

    const result = await processPayment(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Invoice.applyPayment against the SAME store, so the
    // invoice now reflects the payment.
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
    expect(eventNames).toContain("PaymentProcessed");
    expect(eventNames).toContain("PaymentApplied");
  });

  it("skips application when the invoice is still DRAFT (route marks ACCEPTED_NOT_APPLIED)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider, { status: "DRAFT" });
    await seedPayment(provider);
    const engine = newEngine(provider);

    const result = await processPayment(engine);
    // The payment still processes; only the invoice credit is skipped (guard-safe).
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
    expect(eventNames).toContain("PaymentProcessed");
    expect(eventNames).not.toContain("PaymentApplied");
  });

  it("skips application when the payment over-pays the invoice balance", async () => {
    const provider = makeProvider();
    await seedInvoice(provider, { amountDue: 100, total: 100 });
    await seedPayment(provider, { amount: 250 });
    const engine = newEngine(provider);

    const result = await processPayment(engine);
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
  });
});
