/**
 * Shared PrismaPg factory for Neon TCP connections.
 *
 * Prisma ORM v7 `@prisma/adapter-pg` defaults `idleTimeoutMillis` to **10s**
 * (v6 was 300s). After a short idle, the pool reaps sockets; Neon/PgBouncer
 * has already closed them → Prisma **P1017** "Server has closed the connection"
 * on the next query (e.g. `account.findFirst` in tenant resolution).
 *
 * Also: never construct this adapter on every module re-eval. Callers must
 * gate construction behind a `globalThis` PrismaClient singleton. Eager
 * `new PrismaPg(...)` before the singleton check can orphan pools across
 * Turbopack re-evals; that pattern is wrong regardless. Whether orphan pools
 * alone caused a specific "timeout exceeded when trying to connect" under
 * `Promise.all` SSR is plausible, not separately A/B-proven.
 *
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
 */

import { PrismaPg } from "@prisma/adapter-pg";

/** Pool options aligned with Prisma v6 + Neon wake + parallel SSR. */
export const PRISMA_PG_POOL_OPTIONS = {
  /** Neon cold start can exceed 5s; matches `connect_timeout=15` in keys.ts. */
  connectionTimeoutMillis: 15_000,
  /** Match Prisma ORM v6 `max_idle_connection_lifetime` (300s), not v7's 10s. */
  idleTimeoutMillis: 300_000,
  /**
   * Pages like procurement fire ~9 parallel queries; keep headroom for
   * concurrent RSC + layout work without waiting on pool acquire.
   */
  max: 20,
} as const;

/** Create a PrismaPg adapter with Neon-safe pool timeouts. */
export function createPrismaPgAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({
    connectionString,
    ...PRISMA_PG_POOL_OPTIONS,
    onPoolError: (err) => {
      console.error("[db] pg pool error:", err.message);
    },
  });
}
