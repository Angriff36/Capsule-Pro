/**
 * createOutboxAdapter — pins the row shape the /outbox/publish drain depends on.
 *
 * The adapter writes engine emits into the LEGACY tenant."OutboxEvent" table so
 * the every-minute cron drains them into SSE. Three contract points pinned here
 * (each was a real defect found in the pre-wiring audit):
 *   1. tenantId comes from the factory-scoped tenant (engine payloads carry no
 *      tenantId — the old payload-derived fallback wrote the zero UUID and the
 *      drain published to a channel no tenant subscribes to)
 *   2. eventType is the dotted event channel ("kitchen.dish.created"), the
 *      house convention legacy rows use — not the PascalCase event name
 *   3. markDelivered writes status "published" (the OutboxStatus enum member;
 *      the native store's "delivered" is not in the enum and Prisma rejects it)
 */

import { describe, expect, it } from "vitest";
import type { OutboxEntry } from "@angriff36/manifest/outbox";
import { createOutboxAdapter } from "../kitchen/outbox-adapter";
import type { PrismaClientLike } from "../generated/prisma-store-registry.generated";

const TENANT = "11111111-1111-1111-1111-111111111111";

function makeEntry(overrides: Partial<OutboxEntry["event"]> = {}): OutboxEntry {
  return {
    entryId: "entry-1",
    enqueuedAt: 1_700_000_000_000,
    status: "pending",
    attempts: 0,
    event: {
      name: "DishCreated",
      channel: "kitchen.dish.created",
      payload: { name: "Soup" },
      timestamp: 1_700_000_000_000,
      subject: { entity: "Dish", command: "create", id: "dish-1" },
      ...overrides,
    },
  } as OutboxEntry;
}

function makeFakeDb() {
  const calls: {
    create: Record<string, unknown>[];
    createMany: Record<string, unknown>[][];
    updateMany: { where: Record<string, unknown>; data: Record<string, unknown> }[];
  } = { create: [], createMany: [], updateMany: [] };
  const db = {
    outboxEvent: {
      create: async (args: { data: Record<string, unknown> }) => {
        calls.create.push(args.data);
        return args.data;
      },
      createMany: async (args: { data: Record<string, unknown>[] }) => {
        calls.createMany.push(args.data);
        return { count: args.data.length };
      },
      findMany: async () => [],
      updateMany: async (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        calls.updateMany.push(args);
        return { count: 1 };
      },
    },
  };
  return { db: db as unknown as PrismaClientLike, calls };
}

describe("createOutboxAdapter", () => {
  it("enqueue writes the factory tenantId, dotted-channel eventType, and pending status", async () => {
    const { db, calls } = makeFakeDb();
    const adapter = createOutboxAdapter({ db, tenantId: TENANT });

    await adapter.enqueue([makeEntry()]);

    expect(calls.create).toHaveLength(1);
    expect(calls.create[0]).toMatchObject({
      tenantId: TENANT,
      eventType: "kitchen.dish.created",
      aggregateType: "Dish",
      aggregateId: "dish-1",
      status: "pending",
      payload: { name: "Soup" },
    });
  });

  it("payload tenantId, when present, overrides the factory tenantId", async () => {
    const { db, calls } = makeFakeDb();
    const adapter = createOutboxAdapter({ db, tenantId: TENANT });
    const other = "22222222-2222-2222-2222-222222222222";

    await adapter.enqueue([makeEntry({ payload: { tenantId: other } })]);

    expect(calls.create[0]?.tenantId).toBe(other);
  });

  it("falls back to the event name when the event has no channel", async () => {
    const { db, calls } = makeFakeDb();
    const adapter = createOutboxAdapter({ db, tenantId: TENANT });

    await adapter.enqueue([makeEntry({ channel: "" })]);

    expect(calls.create[0]?.eventType).toBe("DishCreated");
  });

  it("markDelivered writes the OutboxStatus enum member 'published'", async () => {
    const { db, calls } = makeFakeDb();
    const adapter = createOutboxAdapter({ db, tenantId: TENANT });

    await adapter.markDelivered(["row-1", "row-2"]);

    expect(calls.updateMany).toHaveLength(1);
    expect(calls.updateMany[0]?.where).toEqual({ id: { in: ["row-1", "row-2"] } });
    expect(calls.updateMany[0]?.data.status).toBe("published");
    expect(calls.updateMany[0]?.data.publishedAt).toBeInstanceOf(Date);
  });
});
