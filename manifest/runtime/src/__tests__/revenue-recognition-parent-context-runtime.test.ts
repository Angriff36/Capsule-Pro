/**
 * RevenueRecognitionSchedule parent-context — runtime inference proof (Task 8.10).
 *
 * Companion to the IR-contract test
 * (apps/api/__tests__/accounting/revenue-recognition-parent-context.test.ts). That
 * test proves RevenueRecognitionSchedule.create does NOT accept the invoice-owned
 * eventId/clientId as params (assertion b of the parent-from-child guardrail). THIS
 * test proves assertion (a): eventId/clientId are actually INFERRED server-side from
 * only the parent FK (invoiceId), against the REAL compiled IR — not a synthetic
 * fixture — AND that the Invoice's own `metadata` does NOT bleed onto the schedule
 * (the schedule keeps `metadata` as a create param precisely to fence it).
 *
 * It exercises the same generic resolver the dispatcher runs
 * (run-manifest-command-core → resolveParentContext), so a regression that stops
 * copying a field, breaks the schedule→Invoice belongsTo wiring, or starts leaking
 * Invoice.metadata, fails here.
 */

import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveParentContext } from "../parent-context-resolver.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-revrec-ctx";
const INVOICE_ID = "inv-rr-1";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
// Every IR entity is `durable`, so RuntimeEngine REQUIRES a storeProvider.
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
    if (!existing) return undefined as never;
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

function makeProvider(): { provider: (entity: string) => Store; stores: Map<string, Mem> } {
  const stores = new Map<string, Mem>();
  const provider = (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
  return { provider, stores };
}

function newEngine(provider: (entity: string) => Store): RuntimeEngine {
  return new RuntimeEngine(ir, { user: { id: "u1", tenantId: TENANT } }, { storeProvider: provider });
}

async function seedInvoice(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("Invoice").create({
    id: INVOICE_ID,
    tenantId: TENANT,
    clientId: "client-rr-9",
    eventId: "evt-rr-9",
    // The Invoice carries its OWN metadata; it must NOT leak onto the schedule.
    metadata: '{"po":"PO-12345"}',
    notes: "invoice notes",
    status: "SENT",
    ...overrides,
  } as never);
}

// Body a real caller sends: the parent link + schedule-specific input only —
// no eventId/clientId (those are inherited from the Invoice).
function createBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    invoiceId: INVOICE_ID,
    contractId: "contract-rr-1",
    totalAmount: 1000,
    method: "STRAIGHT_LINE",
    ...overrides,
  };
}

describe("RevenueRecognitionSchedule create — inherits Invoice-owned eventId/clientId from only invoiceId (real IR)", () => {
  it("fills eventId/clientId server-side from the linked Invoice", async () => {
    const { provider } = makeProvider();
    await seedInvoice(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "RevenueRecognitionSchedule",
      command: "create",
      body: createBody(),
    });

    expect(body.eventId).toBe("evt-rr-9");
    expect(body.clientId).toBe("client-rr-9");
    expect(inheritedFields).toContain("eventId");
    expect(inheritedFields).toContain("clientId");
  });

  it("does NOT bleed the Invoice's own metadata onto the schedule", async () => {
    const { provider } = makeProvider();
    await seedInvoice(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "RevenueRecognitionSchedule",
      command: "create",
      body: createBody(),
    });

    // metadata is a create param -> fenced out of inheritance.
    expect(inheritedFields).not.toContain("metadata");
    expect(body.metadata).toBeUndefined();
    // notes is an EXCLUDED generic field AND a create param -> never inherited.
    expect(inheritedFields).not.toContain("notes");
    expect(body.notes).toBeUndefined();
    // exactly the two intended fields inherit, nothing else.
    expect([...inheritedFields].sort()).toEqual(["clientId", "eventId"]);
  });

  it("lets a child override win over the inherited Invoice value", async () => {
    const { provider } = makeProvider();
    await seedInvoice(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "RevenueRecognitionSchedule",
      command: "create",
      body: createBody({ clientId: "explicit-client" }),
    });

    expect(body.clientId).toBe("explicit-client");
    expect(inheritedFields).not.toContain("clientId");
    // the other invoice-owned field still inherits
    expect(body.eventId).toBe("evt-rr-9");
    expect(inheritedFields).toContain("eventId");
  });

  it("skips empty parent values (no silent blanks copied onto the schedule)", async () => {
    const { provider } = makeProvider();
    await seedInvoice(provider, { clientId: "" });
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "RevenueRecognitionSchedule",
      command: "create",
      body: createBody(),
    });

    expect(body.clientId).toBeUndefined();
    expect(inheritedFields).not.toContain("clientId");
    // a non-empty field still inherits
    expect(body.eventId).toBe("evt-rr-9");
  });

  it("is a no-op when no invoiceId link is supplied (standalone schedule)", async () => {
    const { provider } = makeProvider();
    await seedInvoice(provider);
    const runtime = newEngine(provider);

    const { inheritedFields } = await resolveParentContext(runtime, {
      entity: "RevenueRecognitionSchedule",
      command: "create",
      body: { contractId: "contract-rr-1", totalAmount: 1000, method: "IMMEDIATE" },
    });

    expect(inheritedFields).toEqual([]);
  });
});
