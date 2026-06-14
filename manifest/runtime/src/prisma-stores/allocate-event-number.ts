import { Prisma } from "@repo/database/standalone";
import type { PrismaClient } from "@repo/database/standalone";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

function eventNumberPrefix(year = new Date().getFullYear()): string {
  return `EVT-${year}`;
}

function formatEventNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

function needsAutoEventNumber(eventNumber: unknown): boolean {
  return (
    eventNumber === undefined ||
    eventNumber === null ||
    (typeof eventNumber === "string" && eventNumber.trim() === "")
  );
}

/**
 * Allocate the next tenant-scoped EVT-YYYY-#### inside the caller's transaction.
 * Advisory lock is transaction-scoped so it covers the subsequent insert.
 */
export async function allocateEventNumberInTransaction(
  tx: TransactionClient,
  tenantId: string,
  year = new Date().getFullYear()
): Promise<string> {
  const prefix = eventNumberPrefix(year);
  const lockKey = `${tenantId}:${prefix}`;

  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`
  );

  const count = await tx.event.count({
    where: {
      tenantId,
      eventNumber: { startsWith: prefix },
      deletedAt: null,
    },
  });

  return formatEventNumber(prefix, count + 1);
}

export function resolveEventNumberForCreate(
  data: Record<string, unknown>,
  allocated: string
): Record<string, unknown> {
  const current = data.eventNumber ?? data.event_number;
  if (!needsAutoEventNumber(current)) {
    return data;
  }
  return { ...data, eventNumber: allocated };
}
