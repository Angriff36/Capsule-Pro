import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Neon connection URL normalization for the app runtime.
 *
 * Official Neon guidance (https://neon.com/docs/connect/choose-connection):
 * - App queries → pooled hostname (`-pooler`)
 * - Migrations / Prisma CLI → direct hostname (`DIRECT_URL`, not rewritten here)
 *
 * `connect_timeout=15` gives Neon compute time to wake from scale-to-zero
 * (https://neon.com/docs/guides/prisma — P1001 / wake timeouts).
 *
 * Pool idle lifetime is NOT set here — Prisma v7 driver adapters ignore URL
 * `max_idle_connection_lifetime`. See `create-pg-adapter.ts` (`idleTimeoutMillis`).
 *
 * Pool-sizing URL params (`pgbouncer`, `connection_limit`, `pool_timeout`) are
 * intentionally ABSENT: this runtime uses the `@prisma/adapter-pg` TCP driver,
 * whose pool is governed by `create-pg-adapter.ts` (`max: 20`, connect/idle
 * timeouts) — NOT by PgBouncer/Prisma connection-string flags. Do not re-add
 * them here. (Documented 2026-07-12 per db-performance spec "documented with a reason".)
 */
function toNeonPoolerUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("neon.tech")) {
      return url;
    }
    // Use pooler host if not already pooled
    if (!u.hostname.includes("-pooler")) {
      const beforeRegion = u.hostname.split(".")[0];
      if (beforeRegion?.startsWith("ep-")) {
        u.hostname = u.hostname.replace(beforeRegion, `${beforeRegion}-pooler`);
      }
    }
    // Give Neon time to wake from pause (avoids "Connection terminated unexpectedly" on first request)
    u.searchParams.set("connect_timeout", "15");
    // Node pg treats require/prefer/verify-ca as verify-full; set explicitly to
    // silence the deprecation warning from pg-connection-string.
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "verify-full");
    } else if (u.searchParams.get("sslmode") === "require") {
      u.searchParams.set("sslmode", "verify-full");
    }
    return u.toString();
  } catch {
    return url;
  }
}

export const keys = () => {
  const env = createEnv({
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    server: {
      DATABASE_URL: z.url(),
      /** Optional Neon read-replica URL for analytics/reporting reads. Falls back to primary when unset. */
      ANALYTICS_DATABASE_URL: z.string().url().optional(),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      ANALYTICS_DATABASE_URL: process.env.ANALYTICS_DATABASE_URL,
    },
  });
  return {
    ...env,
    DATABASE_URL: toNeonPoolerUrl(env.DATABASE_URL),
    ANALYTICS_DATABASE_URL: env.ANALYTICS_DATABASE_URL
      ? toNeonPoolerUrl(env.ANALYTICS_DATABASE_URL)
      : undefined,
  };
};
