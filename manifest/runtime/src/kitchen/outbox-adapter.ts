/**
 * D6: OutboxStore adapter wrapping the existing Prisma `outboxEvent` model.
 *
 * Implements the native `OutboxStore` interface from `@angriff36/manifest/outbox`
 * so it can be wired via `RuntimeOptions.outboxStore`, replacing ~16 hand-written
 * `tx.outboxEvent.create` sites.
 *
 * See manifest/MANIFEST-DIVERGENCES.md — D6.
 */

import type { OutboxEntry, OutboxStore } from "@angriff36/manifest/outbox";
import type { PrismaClientLike } from "../generated/prisma-store-registry.generated";

/**
 * Minimal outbox-event shape on the Prisma model — just the fields we read/write.
 */
interface OutboxEventRow {
  id: string;
  tenantId: string;
  eventType: string;
  payload: unknown;
  status: string;
  error: string | null;
  createdAt: Date;
  aggregateId: string;
  aggregateType: string;
}

interface OutboxEventDelegate {
  create(args: { data: Record<string, unknown> }): Promise<OutboxEventRow>;
  createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
  findMany(args: Record<string, unknown>): Promise<OutboxEventRow[]>;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
}

function getDelegate(db: PrismaClientLike): OutboxEventDelegate {
  return (db as unknown as { outboxEvent: OutboxEventDelegate }).outboxEvent;
}

export interface OutboxAdapterOptions {
  db: PrismaClientLike;
}

/**
 * Create an OutboxAdapter backed by the existing Prisma `outboxEvent` model.
 *
 * Maps OutboxEntry → Prisma OutboxEvent:
 *   eventType    ← entry.event.name
 *   aggregateType ← entry.event.subject?.entity
 *   aggregateId  ← entry.event.subject?.id
 *   payload      ← entry.event.payload
 *   status       ← entry.status
 */
export function createOutboxAdapter({ db }: OutboxAdapterOptions): OutboxStore {
  return {
    async enqueue(entries: OutboxEntry[], tx?: unknown): Promise<void> {
      const client = (tx as PrismaClientLike | undefined) ?? db;
      const delegate = getDelegate(client);

      const rows = entries.map((entry) => ({
        eventType: entry.event.name,
        aggregateType: entry.event.subject?.entity ?? "unknown",
        aggregateId: entry.event.subject?.id ?? entry.entryId,
        payload: entry.event.payload ?? {},
        status: entry.status,
        tenantId:
          (entry.event.payload as Record<string, unknown>)?.tenantId as string ??
          "00000000-0000-0000-0000-000000000000",
      }));

      if (rows.length === 1) {
        await delegate.create({ data: rows[0]! });
      } else {
        await delegate.createMany({ data: rows });
      }
    },

    async claim(batchSize: number): Promise<OutboxEntry[]> {
      const delegate = getDelegate(db);
      const rows = await delegate.findMany({
        where: { status: "pending" },
        take: batchSize,
        orderBy: { createdAt: "asc" },
      });

      return rows.map((row: OutboxEventRow): OutboxEntry => ({
        entryId: row.id,
        enqueuedAt: row.createdAt.getTime(),
        event: {
          name: row.eventType,
          channel: "outbox",
          payload: row.payload,
          timestamp: row.createdAt.getTime(),
          subject: {
            entity: row.aggregateType,
            command: "emit",
            id: row.aggregateId,
          },
        },
        status: row.status as "pending" | "delivered" | "failed",
        attempts: 0,
      }));
    },

    async markDelivered(entryIds: string[]): Promise<void> {
      if (entryIds.length === 0) return;
      const delegate = getDelegate(db);
      await delegate.updateMany({
        where: { id: { in: entryIds } },
        data: { status: "delivered", publishedAt: new Date() },
      });
    },

    async markFailed(entryIds: string[], error: string): Promise<void> {
      if (entryIds.length === 0) return;
      const delegate = getDelegate(db);
      await delegate.updateMany({
        where: { id: { in: entryIds } },
        data: { status: "failed", error },
      });
    },
  };
}
