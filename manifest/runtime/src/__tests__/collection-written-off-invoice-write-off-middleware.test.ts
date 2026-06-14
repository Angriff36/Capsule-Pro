/**
 * Middleware conformance — `CollectionWrittenOff → Invoice.writeOff`
 * (IMPLEMENTATION_PLAN P1 "CollectionWrittenOff → Invoice.writeOff").
 *
 * WHY this matters (not just WHAT it does): when a collection case is written off as
 * uncollectable, the underlying invoice must also be marked WRITE_OFF — otherwise AR
 * keeps the dead debt on the books as owed/overdue forever and financial reporting
 * overstates receivables. `CollectionWrittenOff` had ZERO consumers. This middleware
 * closes the loop (the symmetric counterpart of `InvoiceMarkedOverdue → CollectionCase.create`).
 * It CANNOT be a reaction: `CollectionCase.writeOff(amount, reason, approvedBy)` is a
 * MUTATE, so the engine payload `{ ...commandInput, result }` carries only a timestamp
 * scalar; the invoice to write off is `CollectionCase.invoiceId` — the case's OWN field,
 * never auto-populated onto the event. The middleware loads the case via `_subject.id`
 * and dispatches the governed `Invoice.writeOff` for the invoice's full remaining balance.
 *
 * PREREQUISITE BUG regression-locked here: `CollectionCase.writeOff` was a DEAD command —
 * it mutates `status = "WRITTEN_OFF"` but the FSM had no "WRITTEN_OFF" transition target,
 * so the engine rejected every call. The first test asserts the IR now carries that
 * transition (so the source command can fire at all) and the happy-path test proves the
 * case actually reaches WRITTEN_OFF through the real engine.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if either the FSM fix or the propagation regresses.
 *
 * @vitest-environment node
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createCollectionWrittenOffInvoiceWriteOffMiddleware } from "../middleware/collection-written-off-invoice-write-off-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-writeoff-collection";
const CASE_ID = "case-writeoff-1";
const INVOICE_ID = "invoice-writeoff-1";
const CLIENT_ID = "client-writeoff-1";
const EVENT_ID = "event-writeoff-1";
const APPROVER_ID = "approver-writeoff-1";

const USER = {
  id: "user-writeoff-1",
  tenantId: TENANT,
  role: "admin",
} as const;

class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  async getAll(): Promise<never> {
    return Array.from(this.items.values()) as never;
  }
  async getById(id: string): Promise<never> {
    return this.items.get(id) as never;
  }
  async create(data: Record<string, unknown>): Promise<never> {
    const id = (data.id as string) ?? randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async update(id: string, data: Record<string, unknown>): Promise<never> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<never> {
    return this.items.delete(id) as never;
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

function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createCollectionWrittenOffInvoiceWriteOffMiddleware({
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
    invoiceNumber: "INV-WO-1",
    invoiceType: "FINAL_PAYMENT",
    status: "OVERDUE",
    clientId: CLIENT_ID,
    eventId: EVENT_ID,
    subtotal: 8000,
    taxAmount: 0,
    discountAmount: 0,
    total: 8000,
    amountPaid: 0,
    amountDue: 8000,
    paymentTerms: 30,
    dueDate: Date.now() - 86_400_000,
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
  await provider("CollectionCase").create({
    id: CASE_ID,
    tenantId: TENANT,
    invoiceId: INVOICE_ID,
    invoiceNumber: "INV-WO-1",
    eventId: EVENT_ID,
    clientId: CLIENT_ID,
    clientName: "Acme Co",
    originalAmount: 8000,
    outstandingAmount: 8000,
    collectedAmount: 0,
    status: "ACTIVE",
    priority: "MEDIUM",
    dunningStage: "FINAL_NOTICE",
    daysOverdue: 120,
    metadata: "{}",
    deletedAt: null,
    ...overrides,
  } as never);
}

function writeOffCase(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "CollectionCase",
      command: "writeOff",
      body: {
        id: CASE_ID,
        tenantId: TENANT,
        amount: 0,
        reason: "bankruptcy — uncollectable",
        approvedBy: APPROVER_ID,
      },
      user: { ...USER },
    }
  );
}

describe("CollectionWrittenOff → Invoice.writeOff middleware", () => {
  it("the IR carries no CollectionWrittenOff reaction (it is middleware) AND the CollectionCase FSM allows WRITTEN_OFF (the dead-command fix)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) => r.event === "CollectionWrittenOff"
    );
    expect(stale).toHaveLength(0);

    const collectionCase = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "CollectionCase"
    );
    const transitions: { from?: string; to?: string[] }[] =
      collectionCase?.transitions ?? [];
    // writeOff guards status in [ACTIVE, IN_PROGRESS, LEGAL] and mutates to WRITTEN_OFF;
    // every one of those source states must be able to reach WRITTEN_OFF or the command
    // is dead.
    for (const from of ["ACTIVE", "IN_PROGRESS", "LEGAL"]) {
      const rule = transitions.find((t) => t.from === from);
      expect(rule?.to ?? []).toContain("WRITTEN_OFF");
    }
  });

  it("writes off the linked invoice's full balance when a case is written off (and the case reaches WRITTEN_OFF)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    await seedCase(provider);
    const engine = newEngine(provider);

    const result = await writeOffCase(engine);
    expect(result.ok).toBe(true);

    // The source command now actually fires (FSM fix) — case is written off.
    const writtenCase = (await provider("CollectionCase").getById(
      CASE_ID
    )) as { status?: string };
    expect(writtenCase.status).toBe("WRITTEN_OFF");

    // The propagation wrote off the invoice: status WRITE_OFF, amountDue zeroed.
    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as {
      status?: string;
      amountDue?: number;
    };
    expect(invoice.status).toBe("WRITE_OFF");
    expect(Number(invoice.amountDue)).toBe(0);
  });

  it("skips a paid/terminal invoice (case still writes off, invoice untouched)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider, { status: "PAID", amountPaid: 8000, amountDue: 0 });
    await seedCase(provider);
    const engine = newEngine(provider);

    const result = await writeOffCase(engine);
    expect(result.ok).toBe(true);

    const writtenCase = (await provider("CollectionCase").getById(
      CASE_ID
    )) as { status?: string };
    expect(writtenCase.status).toBe("WRITTEN_OFF");

    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as {
      status?: string;
    };
    // Untouched — writeOff guards status in [OVERDUE, PARTIALLY_PAID]; PAID is skipped.
    expect(invoice.status).toBe("PAID");
  });

  it("skips cleanly when the case has no invoiceId (case still writes off, no crash)", async () => {
    const provider = makeProvider();
    await seedCase(provider, { invoiceId: "" });
    const engine = newEngine(provider);

    const result = await writeOffCase(engine);
    expect(result.ok).toBe(true);

    const writtenCase = (await provider("CollectionCase").getById(
      CASE_ID
    )) as { status?: string };
    expect(writtenCase.status).toBe("WRITTEN_OFF");
  });
});
