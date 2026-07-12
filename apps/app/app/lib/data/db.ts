/**
 * apps/app database re-export + raw-query timing helper.
 *
 * Per-query model timing is now applied at the package level
 * (packages/database/query-timing.ts → `withQueryTiming`, attached to the
 * shared `database` singleton), so `database` — and this `db` alias — already
 * emit `[prisma:query] model.op Xms` lines when PRISMA_LOG_QUERIES=1. That
 * covers apps/app's data modules AND the ~137 files that import `database`
 * directly from @repo/database (previously bypassed); apps/api inherits it too.
 *
 * Raw queries ($queryRaw) bypass $extends — use timedQueryRaw() explicitly.
 */

import type { Prisma } from "@repo/database";
import { database } from "@repo/database";

const isLoggingEnabled = process.env.PRISMA_LOG_QUERIES === "1";

export const db = database;

/**
 * Raw-query timing — $queryRaw can't be intercepted by $extends, so time it
 * explicitly when the gate is on.
 */
export async function timedQueryRaw<T>(
  query: Prisma.Sql,
  label: string
): Promise<T> {
  if (!isLoggingEnabled) {
    return database.$queryRaw<T>(query);
  }

  const start = performance.now();
  const result = await database.$queryRaw<T>(query);
  const duration = performance.now() - start;
  console.error(`[prisma:query] raw:${label} ${duration.toFixed(1)}ms`);
  return result;
}
