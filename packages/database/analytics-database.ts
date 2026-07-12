/**
 * Optional read-replica client for analytics/reporting queries.
 *
 * When `ANALYTICS_DATABASE_URL` is set (Neon read replica), heavy OLAP-style
 * reads route here. Otherwise callers transparently fall back to the primary
 * `database` client — no feature flag required at call sites.
 *
 * Uses the same TCP/`pg` adapter as the primary client (Neon choose-connection:
 * long-lived Node → pg, not the serverless HTTP driver).
 *
 * Connection-budget note (documented 2026-07-12 per db-performance spec "documented
 * with a reason"): when `ANALYTICS_DATABASE_URL` is UNSET this returns the SAME
 * primary singleton (no second pool — zero extra connections, NOT double-pressure).
 * When SET it creates one additional `max: 20` `pg` pool against the replica, so a
 * single long-lived process may hold up to 40 Neon connections (primary 20 + replica
 * 20) — the intended read-replica offloading trade-off.
 */

import { createPrismaPgAdapter } from "./create-pg-adapter";
import type { PrismaClient } from "./generated/client";
import { PrismaClient as PrismaClientCtor } from "./generated/client";
import { keys } from "./keys";

type GlobalAnalytics = {
  analyticsPrisma?: PrismaClient;
};

const globalForAnalytics = globalThis as unknown as GlobalAnalytics;

/** Lazily create (or reuse) the analytics read client. */
export function createAnalyticsDatabase(primary: PrismaClient): PrismaClient {
  if (globalForAnalytics.analyticsPrisma) {
    return globalForAnalytics.analyticsPrisma;
  }

  const replicaUrl = process.env.SKIP_ENV_VALIDATION
    ? process.env.ANALYTICS_DATABASE_URL
    : keys().ANALYTICS_DATABASE_URL;

  if (!replicaUrl) {
    globalForAnalytics.analyticsPrisma = primary;
    return primary;
  }

  const adapter = createPrismaPgAdapter(replicaUrl);
  const client = new PrismaClientCtor({ adapter });
  globalForAnalytics.analyticsPrisma = client;

  if (process.env.NODE_ENV !== "production" && typeof process !== "undefined") {
    try {
      const u = new URL(replicaUrl);
      console.error(
        "[db] Using analytics read-replica host:",
        u.hostname,
        "(pooler:",
        `${u.hostname.includes("-pooler")})`,
        "driver: pg/tcp"
      );
    } catch {
      // ignore
    }
  }

  return client;
}
