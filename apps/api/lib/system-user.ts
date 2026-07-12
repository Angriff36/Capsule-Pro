/**
 * Shared system-user resolver for automated/cron actors (db-performance plan
 * item #8).
 *
 * WHY THIS EXISTS — the three DB-heavy crons (`cron/inventory-audit`,
 * `cron/email-reminders`, `cron/contract-expiration-alerts`) each carried a
 * byte-equivalent local copy of this helper and re-resolved the synthetic
 * "system" actor's user id by firing 1-2 `user.findFirst` queries per call.
 * `email-reminders` calls it once per due task claim AND once per upcoming
 * shift; `contract-expiration-alerts` once per in-window contract — so a
 * tenant with N due rows paid `(1-2) × N` queries every tick purely to
 * re-discover the same admin id.
 *
 * THE MEMO — the (tenantId → systemUserId) mapping is resolved once per tenant
 * and cached with a short TTL, mirroring the `tenantCache` pattern in
 * `app/lib/tenant.ts` (db-perf #2). Within one cron tick (seconds) every
 * per-row call after the first is a Map hit, collapsing the per-row N+1 to one
 * lookup per tenant. The TTL bounds staleness across ticks (crons run minutes
 * apart, so each tick effectively re-resolves), and within-tick consistency is
 * desirable: all governed writes in a tick attribute to the same actor instead
 * of flipping mid-tick if an admin is demoted. Only successful lookups are
 * cached — a thrown "no active users" never sticks, so a transiently-empty
 * tenant re-queries until it has a user.
 */
import { database } from "@repo/database";

const SYSTEM_USER_TTL_MS = 30_000;
const systemUserCache = new Map<string, { id: string; expiresAt: number }>();

/**
 * Get a system user id for automated operations (first admin/owner, else any
 * active user). Memoized per `tenantId` for {@link SYSTEM_USER_TTL_MS}.
 */
export async function getSystemUserId(tenantId: string): Promise<string> {
  const cached = systemUserCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }

  const adminUser = await database.user.findFirst({
    where: { tenantId, role: { in: ["owner", "admin"] }, deletedAt: null },
    select: { id: true },
  });
  if (adminUser) {
    systemUserCache.set(tenantId, {
      id: adminUser.id,
      expiresAt: Date.now() + SYSTEM_USER_TTL_MS,
    });
    return adminUser.id;
  }

  const anyUser = await database.user.findFirst({
    where: { tenantId, deletedAt: null },
    select: { id: true },
  });
  if (anyUser) {
    systemUserCache.set(tenantId, {
      id: anyUser.id,
      expiresAt: Date.now() + SYSTEM_USER_TTL_MS,
    });
    return anyUser.id;
  }

  throw new Error(`No active users found for tenant ${tenantId}`);
}
