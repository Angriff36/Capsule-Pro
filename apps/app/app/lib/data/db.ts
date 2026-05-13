/**
 * Database client with optional query duration logging.
 *
 * Set PRISMA_LOG_QUERIES=1 to emit every Prisma query with its duration to stderr.
 *
 * Model-level queries (findMany, create, etc.) are intercepted via $extends.
 * Raw queries ($queryRaw) bypass $extends — use timedQueryRaw() explicitly.
 */

import { database, Prisma } from "@repo/database";

// ---------------------------------------------------------------------------
// Query-logging guard
// ---------------------------------------------------------------------------

const isLoggingEnabled = process.env.PRISMA_LOG_QUERIES === "1";

// ---------------------------------------------------------------------------
// Extended client — model-level query timing
// ---------------------------------------------------------------------------

export const db = database.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = isLoggingEnabled ? performance.now() : 0;
        const result = await query(args);
        if (isLoggingEnabled) {
          const duration = performance.now() - start;
          console.error(
            `[prisma:query] ${model}.${operation} ${duration.toFixed(1)}ms`
          );
        }
        return result;
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Raw query timing helper — $queryRaw can't be intercepted by $extends
// ---------------------------------------------------------------------------

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

export { Prisma };
