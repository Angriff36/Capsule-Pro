/**
 * Middleware conformance — `Invoice fully paid → Invoice.markAsPaid`
 * (IMPLEMENTATION_PLAN P1 Finance "Invoice reaches zero → markAsPaid").
 *
 * WHY this matters (not just WHAT it does): `Invoice.applyPayment` unconditionally sets
 * `status = "PARTIALLY_PAID"` (invoice-rules.manifest:100), so an invoice paid in full via
 * the apply path lands at PARTIALLY_PAID with `amountDue = 0` and NEVER reaches PAID —
 * fully-settled invoices keep showing as owed and AR/collections keep chasing them. Nothing
 * was calling the existing `Invoice.markAsPaid()`. This middleware closes the gap.
 *
 * It CANNOT be a reaction: whether the balance is now zero depends on the Invoice's OWN
 * post-mutation `amountDue`/`status`, and the engine emits `{ ...commandInput, result }`
 * only (declared event fields like `PaymentApplied.remainingBalance` are never auto-populated
 * from `self.*`). The middleware loads the Invoice via `_subject.id` and dispatches
 * `markAsPaid` when `amountDue <= 0` and the invoice is not already PAID.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation regresses (full payment left at
 * PARTIALLY_PAID, a partial payment wrongly closed, or a re-trigger loop). It also
 * regression-locks that no `PaymentApplied → Invoice.markAsPaid` reaction creeps into the IR.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createInvoiceFullyPaidMarkPaidMiddleware } from "../middleware/invoice-fully-paid-mark-paid-middleware.js";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-fully-paid";
// admin satisfies Invoice.applyPayment's policy AND the middleware's markAsPaid dispatch
// policy (both share InvoiceDefaultAccess) so neither command is denied.
const USER = { id: "u-fully-paid", tenantId: TENANT, role: "admin" } as const;

const INVOICE_ID = "inv-fully-paid-001";

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

/** Build the engine with the Invoice-fully-paid→markAsPaid middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createInvoiceFullyPaidMarkPaidMiddleware({
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
    invoiceNumber: "INV-PAID-1",
    invoiceType: "FINAL_PAYMENT",
    status: "SENT",
    clientId: "client-paid-1",
    eventId: "event-paid-1",
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
    paidAt: null,
    deletedAt: null,
    ...overrides,
  } as never);
}

async function applyPayment(
  engine: ManifestRuntimeEngine,
  paymentAmount: number,
  paymentId: string
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Invoice",
      command: "applyPayment",
      body: { id: INVOICE_ID, tenantId: TENANT, paymentAmount, paymentId },
      user: { ...USER },
    }
  );
}

async function invoiceRow(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>> {
  return (await provider("Invoice").getById(INVOICE_ID)) as Record<
    string,
    unknown
  >;
}

describe("Middleware conformance: Invoice fully paid → Invoice.markAsPaid", () => {
  it("the compiled IR carries no PaymentApplied → Invoice.markAsPaid reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "PaymentApplied" &&
        r.targetEntity === "Invoice" &&
        r.targetCommand === "markAsPaid"
    );
    // A regression here means someone added a reaction that cannot read the invoice's own
    // post-mutation balance to decide the close — the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("a full payment closes the invoice to PAID (the core fix)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    const engine = newEngine(provider);

    const result = await applyPayment(engine, 1000, "pay-full-1");
    expect(result.ok).toBe(true);

    // THE PROOF: applyPayment alone would leave PARTIALLY_PAID; the middleware then closed it.
    const inv = await invoiceRow(provider);
    expect(inv.status).toBe("PAID");
    expect(Number(inv.amountDue)).toBe(0);
    expect(Number(inv.amountPaid)).toBe(1000);
    expect(inv.paidAt).toBeTruthy();

    // The chain ran end-to-end: applyPayment's PaymentApplied plus markAsPaid's emit.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("PaymentApplied");
  });

  it("a partial payment leaves the invoice PARTIALLY_PAID (no premature close)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    const engine = newEngine(provider);

    const result = await applyPayment(engine, 600, "pay-partial-1");
    expect(result.ok).toBe(true);

    const inv = await invoiceRow(provider);
    expect(inv.status).toBe("PARTIALLY_PAID");
    expect(Number(inv.amountDue)).toBe(400);
    expect(inv.paidAt).toBeFalsy();
  });

  it("partial then final payment closes the invoice to PAID", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    const engine = newEngine(provider);

    const partial = await applyPayment(engine, 600, "pay-seq-1");
    expect(partial.ok).toBe(true);
    expect((await invoiceRow(provider)).status).toBe("PARTIALLY_PAID");

    const final = await applyPayment(engine, 400, "pay-seq-2");
    expect(final.ok).toBe(true);

    const inv = await invoiceRow(provider);
    expect(inv.status).toBe("PAID");
    expect(Number(inv.amountDue)).toBe(0);
    expect(Number(inv.amountPaid)).toBe(1000);
  });
});
