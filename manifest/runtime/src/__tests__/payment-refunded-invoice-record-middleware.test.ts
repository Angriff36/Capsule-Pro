/**
 * Middleware conformance — `PaymentRefunded → Invoice.recordRefund` (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): refunding a payment is supposed to credit the
 * refund BACK against its linked invoice so `amountPaid`/`amountDue`/`status` track refund
 * reality. This was a SILENT NO-OP: the old `on PaymentRefunded run Invoice.recordRefund`
 * reaction read `resolve payload.result.invoiceId` and `paymentId: payload.result.id`, but
 * `Payment.refund`/`partialRefund` are MUTATE commands, so the engine's emitted payload
 * `{ ...commandInput, result }` carries `result` = the last mutate's scalar (`description`),
 * NOT the Payment instance. `invoiceId` is the Payment's OWN field and is NOT a refund input
 * param, so NO reaction can resolve the target invoice. The refund route relies on this
 * propagation (it does not credit the invoice itself), so refunds debited the payment but the
 * invoice's books never moved. The fix replaces the dead reaction with middleware that LOADS
 * the refunded Payment from the store and dispatches the governed `Invoice.recordRefund`.
 *
 * A SECOND, latent defect this proves fixed: `Invoice.recordRefund` mutates
 * `status -> PARTIALLY_PAID`, but the runtime does NOT exempt no-op self-transitions
 * (notes §21). `PARTIALLY_PAID`'s old `to` list was `[PAID, WRITTEN_OFF]` and `PAID` was
 * terminal — so recordRefund's transition was REJECTED in BOTH realistic refund states
 * (PARTIALLY_PAID→PARTIALLY_PAID and PAID→PARTIALLY_PAID). The target command was DEAD. The
 * fix adds the `PARTIALLY_PAID` self-loop and `PAID -> PARTIALLY_PAID`, so a refund actually
 * persists.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation regresses — invoice not credited back, wrong
 * amount, the engine stops dispatching, or the transition fix is reverted — i.e. it fails when
 * the BUSINESS propagation breaks, not on a shape change (CLAUDE.md Rule 9; constitution §13).
 * It also regression-locks that the broken reaction does not creep back into the IR.
 *
 * Chain proven here:
 *   Payment.refund(refundAmount=R, reason)
 *     → emits PaymentRefunded (_subject.id = the Payment id; payload.refundAmount = R)
 *     → middleware loads the Payment, reads invoiceId, reads R from the payload
 *     → dispatches Invoice.recordRefund(refundAmount=R, paymentId)
 *     → the invoice's amountPaid drops, amountDue rises, RefundRecorded bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPaymentRefundedInvoiceRecordMiddleware } from "../middleware/payment-refunded-invoice-record-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-refund-invoice";
// admin satisfies Payment.refund's policy AND the middleware's Invoice.recordRefund
// dispatch policy so neither the source command nor the downstream is denied.
const USER = { id: "u-refund-invoice", tenantId: TENANT, role: "admin" } as const;

const PAYMENT_ID = "pay-r-001";
const INVOICE_ID = "inv-r-001";

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

/** Build the engine with the Payment→Invoice refund middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPaymentRefundedInvoiceRecordMiddleware({
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
  // Realistic post-payment state: a partial payment was applied (amountPaid=250),
  // so a refund has something to credit back.
  await provider("Invoice").create({
    id: INVOICE_ID,
    tenantId: TENANT,
    invoiceNumber: "INV-R-0001",
    invoiceType: "FINAL_PAYMENT",
    status: "PARTIALLY_PAID",
    clientId: "client-1",
    eventId: "event-1",
    subtotal: 1000,
    taxAmount: 0,
    discountAmount: 0,
    total: 1000,
    amountPaid: 250,
    amountDue: 750,
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
  // Seed directly via the store so the test isolates the refund → middleware chain.
  // `refund` guards `self.isRefundable` (status COMPLETED and refundedAt == null).
  await provider("Payment").create({
    id: PAYMENT_ID,
    tenantId: TENANT,
    amount: 250,
    currency: "USD",
    status: "COMPLETED",
    methodType: "CREDIT_CARD",
    invoiceId: INVOICE_ID,
    eventId: "event-1",
    clientId: "client-1",
    gatewayTransactionId: "txn-abc",
    refundedAt: null,
    fraudStatus: "NOT_CHECKED",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function refundPayment(
  engine: ManifestRuntimeEngine,
  command: "refund" | "partialRefund",
  refundAmount: number
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Payment",
      command,
      body: {
        id: PAYMENT_ID,
        tenantId: TENANT,
        refundAmount,
        reason: "customer cancellation",
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: PaymentRefunded → Invoice.recordRefund", () => {
  it("the compiled IR no longer carries the broken Payment→Invoice refund reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "PaymentRefunded" &&
        r.targetEntity === "Invoice" &&
        r.targetCommand === "recordRefund"
    );
    // A regression here means someone re-added the dead `payload.result.*` reaction;
    // the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("Invoice transitions permit recordRefund's status -> PARTIALLY_PAID (self-loop + PAID reversal)", () => {
    // biome-ignore lint/suspicious/noExplicitAny: structural IR.
    const invoice = ((ir.entities ?? []) as any[]).find(
      (e) => e?.name === "Invoice"
    );
    // biome-ignore lint/suspicious/noExplicitAny: structural IR.
    const transitions: any[] = invoice?.transitions ?? [];
    const partial = transitions.find(
      (t) => t.property === "status" && t.from === "PARTIALLY_PAID"
    );
    const paid = transitions.find(
      (t) => t.property === "status" && t.from === "PAID"
    );
    // Without these, recordRefund's transition is rejected and the target command is
    // dead (the runtime does not exempt no-op self-transitions — notes §21).
    expect(partial?.to).toContain("PARTIALLY_PAID");
    expect(paid?.to).toContain("PARTIALLY_PAID");
  });

  it("refunding a partially-paid invoice credits the refund back (amountPaid down, amountDue up)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    await seedPayment(provider);
    const engine = newEngine(provider);

    const result = await refundPayment(engine, "refund", 250);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Invoice.recordRefund against the SAME store, so the
    // invoice books reflect the refund.
    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as Record<
      string,
      unknown
    >;
    expect(Number(invoice.amountPaid)).toBe(0);
    expect(Number(invoice.amountDue)).toBe(1000);
    expect(invoice.status).toBe("PARTIALLY_PAID");

    // Secondary proof: the downstream command's own event bubbles up into the parent
    // command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("PaymentRefunded");
    expect(eventNames).toContain("RefundRecorded");
  });

  it("a partial refund records the partial amount against the invoice", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    await seedPayment(provider);
    const engine = newEngine(provider);

    const result = await refundPayment(engine, "partialRefund", 100);
    expect(result.ok).toBe(true);

    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as Record<
      string,
      unknown
    >;
    expect(Number(invoice.amountPaid)).toBe(150);
    expect(Number(invoice.amountDue)).toBe(850);
    expect(invoice.status).toBe("PARTIALLY_PAID");
  });

  it("refunding a fully-PAID invoice reverses it to PARTIALLY_PAID (PAID is no longer terminal)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider, { status: "PAID", amountPaid: 250, amountDue: 0 });
    await seedPayment(provider);
    const engine = newEngine(provider);

    const result = await refundPayment(engine, "refund", 250);
    expect(result.ok).toBe(true);

    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as Record<
      string,
      unknown
    >;
    expect(Number(invoice.amountPaid)).toBe(0);
    expect(Number(invoice.amountDue)).toBe(250);
    expect(invoice.status).toBe("PARTIALLY_PAID");
  });

  it("skips recording when the refund exceeds the invoice's amountPaid (guard-safe no-op)", async () => {
    const provider = makeProvider();
    // Invoice only ever received 100, but the payment (and refund) is 250.
    await seedInvoice(provider, { amountPaid: 100, amountDue: 900 });
    await seedPayment(provider);
    const engine = newEngine(provider);

    const result = await refundPayment(engine, "refund", 250);
    // The payment still refunds; only the invoice credit is skipped (mirrors
    // recordRefund's `refundAmount <= self.amountPaid` guard) instead of producing a
    // swallowed guard failure.
    expect(result.ok).toBe(true);

    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as Record<
      string,
      unknown
    >;
    expect(Number(invoice.amountPaid)).toBe(100);
    expect(Number(invoice.amountDue)).toBe(900);
  });
});
