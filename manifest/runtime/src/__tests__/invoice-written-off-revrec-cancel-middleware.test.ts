/**
 * Middleware conformance — `InvoiceWrittenOff → RevenueRecognitionSchedule.cancel`
 * (IMPLEMENTATION_PLAN P1, Finance & collections).
 *
 * WHY this matters (not just WHAT it does): when an invoice is written off as
 * uncollectable, any revenue-recognition schedule still recognizing revenue against
 * that invoice must STOP. Otherwise the books keep accruing earned revenue on a debt
 * that will never be collected (overstating recognized revenue) and PENDING/IN_PROGRESS
 * schedules dangle forever. `InvoiceWrittenOff` had ZERO consumers and
 * `RevenueRecognitionSchedule.cancel` was unreachable from the invoice lifecycle.
 *
 * It CANNOT be a reaction: `Invoice.writeOff(reason, writeOffAmount)` is a MUTATE, so
 * the engine payload `{ ...commandInput, result }` carries only a scalar; the schedule(s)
 * to cancel are found by `RevenueRecognitionSchedule.invoiceId` — the SCHEDULE's OWN
 * field on the related child entity — and it is a 1:N fan-out (one invoice → many
 * schedules) a single-target reaction cannot do. The middleware scans the schedule store
 * by invoiceId and dispatches the governed `cancel(reason)` for each cancellable one.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation or the target command regress.
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
import { createInvoiceWrittenOffRevRecCancelMiddleware } from "../middleware/invoice-written-off-revrec-cancel-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-writeoff-revrec";
const INVOICE_ID = "invoice-revrec-1";
const CLIENT_ID = "client-revrec-1";
const EVENT_ID = "event-revrec-1";
const CONTRACT_ID = "contract-revrec-1";

const USER = {
  id: "user-revrec-1",
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
    createInvoiceWrittenOffRevRecCancelMiddleware({
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
    invoiceNumber: "INV-RR-1",
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

let scheduleSeq = 0;
async function seedSchedule(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  scheduleSeq += 1;
  const id = (overrides.id as string) ?? `revrec-${scheduleSeq}`;
  await provider("RevenueRecognitionSchedule").create({
    id,
    tenantId: TENANT,
    invoiceId: INVOICE_ID,
    eventId: EVENT_ID,
    contractId: CONTRACT_ID,
    clientId: CLIENT_ID,
    // amount_consistent: total == recognized + remaining (must hold or the
    // entity-level block constraint silently drops cancel's mutate).
    totalAmount: 8000,
    recognizedAmount: 2000,
    remainingAmount: 6000,
    method: "STRAIGHT_LINE",
    status: "IN_PROGRESS",
    startDate: Date.now() - 10 * 86_400_000,
    endDate: Date.now() + 30 * 86_400_000,
    recognitionPeriod: 0,
    serviceStartDate: Date.now() - 10 * 86_400_000,
    serviceEndDate: Date.now() + 30 * 86_400_000,
    totalMilestones: 0,
    completedMilestones: 0,
    description: "",
    notes: "",
    metadata: "",
    completedAt: null,
    ...overrides,
  } as never);
  return id;
}

function writeOffInvoice(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Invoice",
      command: "writeOff",
      body: {
        id: INVOICE_ID,
        tenantId: TENANT,
        reason: "bankruptcy — uncollectable",
        writeOffAmount: 8000,
      },
      user: { ...USER },
    }
  );
}

describe("InvoiceWrittenOff → RevenueRecognitionSchedule.cancel middleware", () => {
  it("the IR carries no InvoiceWrittenOff reaction (it is middleware) AND the schedule FSM allows CANCELLED from every cancellable state", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) => r.event === "InvoiceWrittenOff");
    expect(stale).toHaveLength(0);

    const schedule = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "RevenueRecognitionSchedule"
    );
    expect(schedule).toBeTruthy();
    const transitions: { from?: string; to?: string[] }[] =
      schedule?.transitions ?? [];
    // cancel guards status in [PENDING, IN_PROGRESS, PAUSED]; each must be able to
    // reach CANCELLED or the propagation cannot fire from that state.
    for (const from of ["PENDING", "IN_PROGRESS", "PAUSED"]) {
      const rule = transitions.find((t) => t.from === from);
      expect(rule?.to ?? []).toContain("CANCELLED");
    }
  });

  it("cancels the in-progress schedule when its invoice is written off (and the invoice reaches WRITE_OFF)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    const scheduleId = await seedSchedule(provider, { status: "IN_PROGRESS" });
    const engine = newEngine(provider);

    const result = await writeOffInvoice(engine);
    expect(result.ok).toBe(true);

    // Source command fired: the invoice is written off.
    const invoice = (await provider("Invoice").getById(INVOICE_ID)) as {
      status?: string;
    };
    expect(invoice.status).toBe("WRITE_OFF");

    // Propagation cancelled the schedule.
    const schedule = (await provider(
      "RevenueRecognitionSchedule"
    ).getById(scheduleId)) as { status?: string };
    expect(schedule.status).toBe("CANCELLED");
  });

  it("fans out across multiple schedules for the invoice and leaves COMPLETED ones untouched (1:N, guard-safe)", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    const pendingId = await seedSchedule(provider, {
      id: "revrec-pending",
      status: "PENDING",
    });
    const inProgressId = await seedSchedule(provider, {
      id: "revrec-inprogress",
      status: "IN_PROGRESS",
    });
    const completedId = await seedSchedule(provider, {
      id: "revrec-completed",
      status: "COMPLETED",
      recognizedAmount: 8000,
      remainingAmount: 0,
    });
    const engine = newEngine(provider);

    const result = await writeOffInvoice(engine);
    expect(result.ok).toBe(true);

    const pending = (await provider("RevenueRecognitionSchedule").getById(
      pendingId
    )) as { status?: string };
    const inProgress = (await provider("RevenueRecognitionSchedule").getById(
      inProgressId
    )) as { status?: string };
    const completed = (await provider("RevenueRecognitionSchedule").getById(
      completedId
    )) as { status?: string };

    expect(pending.status).toBe("CANCELLED");
    expect(inProgress.status).toBe("CANCELLED");
    // COMPLETED is terminal — cancel guards exclude it, so it is left alone.
    expect(completed.status).toBe("COMPLETED");
  });

  it("does not touch a schedule belonging to a different invoice", async () => {
    const provider = makeProvider();
    await seedInvoice(provider);
    const otherId = await seedSchedule(provider, {
      id: "revrec-other-invoice",
      invoiceId: "some-other-invoice",
      status: "IN_PROGRESS",
    });
    const engine = newEngine(provider);

    const result = await writeOffInvoice(engine);
    expect(result.ok).toBe(true);

    const other = (await provider("RevenueRecognitionSchedule").getById(
      otherId
    )) as { status?: string };
    expect(other.status).toBe("IN_PROGRESS");
  });
});
