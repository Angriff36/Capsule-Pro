/**
 * Persistence tests for RevenueRecognitionSchedule + RevenueRecognitionLine
 * Prisma stores.
 *
 * What these tests pin (and why):
 *   - create/update/getById/getAll/delete route to the correct Prisma
 *     delegate (`revenueRecognitionSchedule`, `revenueRecognitionLine`).
 *     This is the structural fact the audit/governance work depends on:
 *     until these tests exist, the only proof the dedicated stores write
 *     to the relational columns is "we wrote the code". The mock asserts
 *     the actual delegate is called and the relational columns appear
 *     verbatim in the call.
 *   - update() uses the composite-key `tenantId_id` where clause. A miss
 *     here would let one tenant overwrite another tenant's row.
 *   - delete() soft-deletes via `deletedAt` instead of hard-deleting —
 *     the schedule tracks `deletedAt` and downstream reports filter on it.
 *   - mapToManifestEntity translates Prisma's DateTime columns to ms-epoch
 *     numbers (matching the manifest IR's `number = 0` shape).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const TID = "00000000-0000-0000-0000-000000000001";
const SCHEDULE_ID = "11111111-1111-4111-8111-111111111111";
const LINE_ID = "22222222-2222-4222-8222-222222222222";
const INVOICE_ID = "33333333-3333-4333-8333-333333333333";
const EVENT_ID = "44444444-4444-4444-8444-444444444444";
const CONTRACT_ID = "55555555-5555-4555-8555-555555555555";
const CLIENT_ID = "66666666-6666-4666-8666-666666666666";

const START = new Date("2026-01-01T00:00:00.000Z");
const END = new Date("2026-12-31T23:59:59.000Z");
const START_MS = START.getTime();
const END_MS = END.getTime();

/** Minimal Decimal stand-in for mock rows with Decimal fields. */
class DecimalStub {
  constructor(public readonly value: string) {}
  toString() {
    return this.value;
  }
}

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockSchedule = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockLine = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  PrismaClient: class {},
  Prisma: {},
}));

interface MockClient {
  revenueRecognitionSchedule: typeof mockSchedule;
  revenueRecognitionLine: typeof mockLine;
}

function makeMockClient(): MockClient {
  return {
    revenueRecognitionSchedule: { ...mockSchedule },
    revenueRecognitionLine: { ...mockLine },
  };
}

// ---------------------------------------------------------------------------
// Imports (after vi.mock)
// ---------------------------------------------------------------------------

import {
  RevenueRecognitionLinePrismaStore,
  RevenueRecognitionSchedulePrismaStore,
} from "../src/prisma-stores/revenue-recognition";

// Hoisted mocks carry call history across tests by default; reset each time
// so per-test `mock.calls[0]` indexes the call this test made, not whatever
// earlier test happened to leak.
beforeEach(() => {
  for (const m of [mockSchedule, mockLine]) {
    for (const fn of Object.values(m)) {
      fn.mockReset();
    }
  }
});

// ===========================================================================
// RevenueRecognitionSchedulePrismaStore
// ===========================================================================

describe("RevenueRecognitionSchedulePrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: SCHEDULE_ID,
    invoiceId: INVOICE_ID,
    eventId: EVENT_ID,
    contractId: CONTRACT_ID,
    clientId: CLIENT_ID,
    totalAmount: new DecimalStub("1000.00"),
    recognizedAmount: new DecimalStub("0.00"),
    remainingAmount: new DecimalStub("1000.00"),
    method: "STRAIGHT_LINE",
    status: "PENDING",
    startDate: START,
    endDate: END,
    recognitionPeriod: 12,
    serviceStartDate: null,
    serviceEndDate: null,
    totalMilestones: 0,
    completedMilestones: 0,
    description: "Q1 service contract",
    notes: null,
    metadata: {},
    createdAt: START,
    updatedAt: START,
    completedAt: null,
    deletedAt: null,
  };

  it("create writes every relational column to revenueRecognitionSchedule (not PrismaJsonStore)", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.create.mockResolvedValue(fakeRow);
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    await store.create({
      id: SCHEDULE_ID,
      invoiceId: INVOICE_ID,
      eventId: EVENT_ID,
      contractId: CONTRACT_ID,
      clientId: CLIENT_ID,
      totalAmount: 1000,
      remainingAmount: 1000,
      method: "STRAIGHT_LINE",
      status: "PENDING",
      startDate: START_MS,
      endDate: END_MS,
      recognitionPeriod: 12,
      description: "Q1 service contract",
    });

    expect(client.revenueRecognitionSchedule.create).toHaveBeenCalledTimes(1);
    const call = client.revenueRecognitionSchedule.create.mock.calls[0][0];
    expect(call.data).toEqual(
      expect.objectContaining({
        tenantId: TID,
        id: SCHEDULE_ID,
        invoiceId: INVOICE_ID,
        eventId: EVENT_ID,
        contractId: CONTRACT_ID,
        clientId: CLIENT_ID,
        method: "STRAIGHT_LINE",
        status: "PENDING",
        recognitionPeriod: 12,
        totalMilestones: 0,
        completedMilestones: 0,
        description: "Q1 service contract",
      })
    );
    // Dates must be passed as `Date`, not raw numbers — the Prisma column is
    // DateTime/Timestamptz.
    expect(call.data.startDate).toBeInstanceOf(Date);
    expect(call.data.endDate).toBeInstanceOf(Date);
    expect((call.data.startDate as Date).getTime()).toBe(START_MS);
    expect((call.data.endDate as Date).getTime()).toBe(END_MS);
  });

  it("create defaults method to IMMEDIATE and status to PENDING when omitted", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.create.mockResolvedValue(fakeRow);
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    await store.create({
      invoiceId: INVOICE_ID,
      eventId: EVENT_ID,
      contractId: CONTRACT_ID,
      clientId: CLIENT_ID,
      totalAmount: 100,
    });

    const call = client.revenueRecognitionSchedule.create.mock.calls[0][0];
    expect(call.data.method).toBe("IMMEDIATE");
    expect(call.data.status).toBe("PENDING");
    // remainingAmount falls back to totalAmount when not provided.
    expect(String(call.data.remainingAmount)).toBe("100");
  });

  it("getAll filters by tenantId and deletedAt null, ordered by createdAt desc", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.findMany.mockResolvedValue([fakeRow]);
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    const result = await store.getAll();
    expect(client.revenueRecognitionSchedule.findMany).toHaveBeenCalledWith({
      where: { tenantId: TID, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(SCHEDULE_ID);
  });

  it("getById uses tenantId + id + deletedAt null (prevents cross-tenant read)", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.findFirst.mockResolvedValue(fakeRow);
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    await store.getById(SCHEDULE_ID);
    expect(client.revenueRecognitionSchedule.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TID, id: SCHEDULE_ID, deletedAt: null },
    });
  });

  it("update writes only patched columns using composite key tenantId_id", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.update.mockResolvedValue({
      ...fakeRow,
      status: "IN_PROGRESS",
    });
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    await store.update(SCHEDULE_ID, { status: "IN_PROGRESS" });

    expect(client.revenueRecognitionSchedule.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: SCHEDULE_ID } },
      data: { status: "IN_PROGRESS" },
    });
  });

  it("update with manifest-shaped recognizeAmount payload updates the Decimal columns", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.update.mockResolvedValue(fakeRow);
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    await store.update(SCHEDULE_ID, {
      recognizedAmount: 250,
      remainingAmount: 750,
    });

    const call = client.revenueRecognitionSchedule.update.mock.calls[0][0];
    expect(String(call.data.recognizedAmount)).toBe("250");
    expect(String(call.data.remainingAmount)).toBe("750");
    // Untouched columns must NOT appear in the patch — otherwise overlapping
    // commands clobber each other's mutations.
    expect(call.data).not.toHaveProperty("totalAmount");
    expect(call.data).not.toHaveProperty("status");
  });

  it("delete soft-deletes via deletedAt (not hard delete)", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: START,
    });
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    const result = await store.delete(SCHEDULE_ID);

    expect(client.revenueRecognitionSchedule.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: SCHEDULE_ID } },
      data: { deletedAt: expect.any(Date) },
    });
    // Hard delete delegate should NEVER be called for soft-deletable entities.
    expect(client.revenueRecognitionSchedule.delete).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("mapToManifestEntity converts DateTime columns to ms-epoch numbers", async () => {
    const client = makeMockClient();
    client.revenueRecognitionSchedule.findMany.mockResolvedValue([fakeRow]);
    const store = new RevenueRecognitionSchedulePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionSchedulePrismaStore
      >[0],
      TID
    );

    const [entity] = await store.getAll();
    expect(entity).toEqual(
      expect.objectContaining({
        id: SCHEDULE_ID,
        tenantId: TID,
        invoiceId: INVOICE_ID,
        method: "STRAIGHT_LINE",
        status: "PENDING",
        startDate: START_MS,
        endDate: END_MS,
        recognitionPeriod: 12,
        totalMilestones: 0,
        completedMilestones: 0,
        deletedAt: null,
      })
    );
    // DateTime columns must be epoch numbers, not Date instances.
    expect(typeof entity.startDate).toBe("number");
    expect(typeof entity.endDate).toBe("number");
  });
});

// ===========================================================================
// RevenueRecognitionLinePrismaStore
// ===========================================================================

describe("RevenueRecognitionLinePrismaStore", () => {
  const fakeRow = {
    tenantId: TID,
    id: LINE_ID,
    scheduleId: SCHEDULE_ID,
    sequence: 1,
    amount: new DecimalStub("100.00"),
    recognizedAmount: new DecimalStub("0.00"),
    status: "PENDING",
    dueDate: END,
    recognizedAt: null,
    milestoneId: null,
    milestoneName: null,
    milestoneDescription: null,
    description: "First recognition line",
    notes: null,
    metadata: {},
    createdAt: START,
    updatedAt: START,
    deletedAt: null,
  };

  it("create writes every relational column to revenueRecognitionLine", async () => {
    const client = makeMockClient();
    client.revenueRecognitionLine.create.mockResolvedValue(fakeRow);
    const store = new RevenueRecognitionLinePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionLinePrismaStore
      >[0],
      TID
    );

    await store.create({
      id: LINE_ID,
      scheduleId: SCHEDULE_ID,
      sequence: 1,
      amount: 100,
      status: "PENDING",
      dueDate: END_MS,
      description: "First recognition line",
    });

    const call = client.revenueRecognitionLine.create.mock.calls[0][0];
    expect(call.data).toEqual(
      expect.objectContaining({
        tenantId: TID,
        id: LINE_ID,
        scheduleId: SCHEDULE_ID,
        sequence: 1,
        status: "PENDING",
        description: "First recognition line",
      })
    );
    expect(String(call.data.amount)).toBe("100");
    expect(String(call.data.recognizedAmount)).toBe("0");
    expect(call.data.dueDate).toBeInstanceOf(Date);
    expect((call.data.dueDate as Date).getTime()).toBe(END_MS);
  });

  it("getAll orders by scheduleId, sequence (matches downstream queries)", async () => {
    const client = makeMockClient();
    client.revenueRecognitionLine.findMany.mockResolvedValue([fakeRow]);
    const store = new RevenueRecognitionLinePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionLinePrismaStore
      >[0],
      TID
    );

    await store.getAll();

    expect(client.revenueRecognitionLine.findMany).toHaveBeenCalledWith({
      where: { tenantId: TID, deletedAt: null },
      orderBy: [{ scheduleId: "asc" }, { sequence: "asc" }],
    });
  });

  it("update can transition status PENDING → RECOGNIZED with recognizedAt date", async () => {
    const client = makeMockClient();
    client.revenueRecognitionLine.update.mockResolvedValue({
      ...fakeRow,
      status: "RECOGNIZED",
      recognizedAt: END,
      recognizedAmount: new DecimalStub("100.00"),
    });
    const store = new RevenueRecognitionLinePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionLinePrismaStore
      >[0],
      TID
    );

    await store.update(LINE_ID, {
      status: "RECOGNIZED",
      recognizedAmount: 100,
      recognizedAt: END_MS,
    });

    const call = client.revenueRecognitionLine.update.mock.calls[0][0];
    expect(call.where).toEqual({
      tenantId_id: { tenantId: TID, id: LINE_ID },
    });
    expect(call.data.status).toBe("RECOGNIZED");
    expect(String(call.data.recognizedAmount)).toBe("100");
    expect(call.data.recognizedAt).toBeInstanceOf(Date);
  });

  it("delete soft-deletes via deletedAt", async () => {
    const client = makeMockClient();
    client.revenueRecognitionLine.update.mockResolvedValue({
      ...fakeRow,
      deletedAt: START,
    });
    const store = new RevenueRecognitionLinePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionLinePrismaStore
      >[0],
      TID
    );

    const result = await store.delete(LINE_ID);

    expect(client.revenueRecognitionLine.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TID, id: LINE_ID } },
      data: { deletedAt: expect.any(Date) },
    });
    expect(client.revenueRecognitionLine.delete).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("mapToManifestEntity converts DateTime columns to ms-epoch", async () => {
    const client = makeMockClient();
    client.revenueRecognitionLine.findMany.mockResolvedValue([fakeRow]);
    const store = new RevenueRecognitionLinePrismaStore(
      client as unknown as Parameters<
        typeof RevenueRecognitionLinePrismaStore
      >[0],
      TID
    );

    const [entity] = await store.getAll();
    expect(entity).toEqual(
      expect.objectContaining({
        id: LINE_ID,
        tenantId: TID,
        scheduleId: SCHEDULE_ID,
        sequence: 1,
        status: "PENDING",
        dueDate: END_MS,
        recognizedAt: 0,
        deletedAt: null,
      })
    );
  });
});

// ===========================================================================
// Wiring tests — confirms the runtime factory picks up the new stores.
// ===========================================================================
//
// These tests guard against the most likely future regression: someone
// removes the case from createPrismaStoreProvider but leaves the entity
// in ENTITIES_WITH_SPECIFIC_STORES (or vice versa), causing the runtime
// to silently fall back to PrismaJsonStore again.

describe("Runtime factory wiring", () => {
  it("createPrismaStoreProvider returns RevenueRecognitionSchedulePrismaStore", async () => {
    const { createPrismaStoreProvider } = await import(
      "../src/prisma-store.js"
    );
    const client = makeMockClient();
    const provider = createPrismaStoreProvider(
      client as unknown as Parameters<typeof createPrismaStoreProvider>[0],
      TID
    );
    const store = provider("RevenueRecognitionSchedule");
    expect(store).toBeInstanceOf(RevenueRecognitionSchedulePrismaStore);
  });

  it("createPrismaStoreProvider returns RevenueRecognitionLinePrismaStore", async () => {
    const { createPrismaStoreProvider } = await import(
      "../src/prisma-store.js"
    );
    const client = makeMockClient();
    const provider = createPrismaStoreProvider(
      client as unknown as Parameters<typeof createPrismaStoreProvider>[0],
      TID
    );
    const store = provider("RevenueRecognitionLine");
    expect(store).toBeInstanceOf(RevenueRecognitionLinePrismaStore);
  });
});
