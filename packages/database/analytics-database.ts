/**
 * Optional read-replica client for analytics/reporting queries.
 *
 * When `ANALYTICS_DATABASE_URL` is set (Neon read replica), heavy OLAP-style
 * reads route here. Otherwise callers transparently fall back to the primary
 * `database` client — no feature flag required at call sites.
 */

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import type { PrismaClient } from "./generated/client";
import { PrismaClient as PrismaClientCtor } from "./generated/client";
import { keys } from "./keys";

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;
(neonConfig as unknown as Record<string, unknown>).parseInputDatesAsUTC = true;

let analyticsClient: PrismaClient | undefined;

/** Lazily create (or reuse) the analytics read client. */
export function createAnalyticsDatabase(primary: PrismaClient): PrismaClient {
  if (analyticsClient) {
    return analyticsClient;
  }

  const replicaUrl = process.env.SKIP_ENV_VALIDATION
    ? process.env.ANALYTICS_DATABASE_URL
    : keys().ANALYTICS_DATABASE_URL;

  if (!replicaUrl) {
    analyticsClient = primary;
    return analyticsClient;
  }

  const adapter = new PrismaNeon({ connectionString: replicaUrl });
  analyticsClient = new PrismaClientCtor({ adapter });

  if (process.env.NODE_ENV !== "production" && typeof process !== "undefined") {
    try {
      const u = new URL(replicaUrl);
      console.error(
        "[db] Using analytics read-replica host:",
        u.hostname,
        "(pooler:",
        `${u.hostname.includes("-pooler")})`
      );
    } catch {
      // ignore
    }
  }

  return analyticsClient;
}
