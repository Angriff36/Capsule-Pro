/**
 * Dev-only Prisma extension: per-query duration logging + slow-query warning.
 *
 * Gated by PRISMA_LOG_QUERIES=1 (same flag as apps/app's data/db). In production
 * or when unset, returns the client unchanged → zero runtime overhead.
 *
 * Centralized here (rather than only in apps/app/app/lib/data/db.ts) so BOTH
 * apps inherit it: apps/api had NO query timing, and ~137 apps/app files import
 * `database` directly from @repo/database, bypassing apps/app's data/db wrapper.
 * Attaching at the shared singleton (packages/database/index.ts) covers all of
 * them in one place.
 *
 * Slow threshold defaults to 50ms; override with DB_PERF_SLOW_MS.
 * Raw queries ($queryRaw) bypass $extends — see timedQueryRaw() in apps/app.
 *
 * Why $extends and not Prisma's `log:[{emit:'event',level:'query'}]`: Prisma 7
 * driver-adapter mode ignores the log-event option, so the $extends query hook
 * is the only correct timing path under @prisma/adapter-pg.
 */
import type { PrismaClient } from "./generated/client";

const isLoggingEnabled = process.env.PRISMA_LOG_QUERIES === "1";
const SLOW_QUERY_MS = Number(process.env.DB_PERF_SLOW_MS) || 50;

/** Dev-only Prisma extension — logs each query's duration; warns when slow. */
export function withQueryTiming(client: PrismaClient): PrismaClient {
  if (!isLoggingEnabled) {
    return client;
  }

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const duration = performance.now() - start;
          const ms = duration.toFixed(1);
          console.error(`[prisma:query] ${model}.${operation} ${ms}ms`);
          if (duration > SLOW_QUERY_MS) {
            console.error(
              `[prisma:query] SLOW ${model}.${operation} ${ms}ms (>${SLOW_QUERY_MS}ms)`
            );
          }
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
