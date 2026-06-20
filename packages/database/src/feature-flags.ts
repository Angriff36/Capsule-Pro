/**
 * Feature flag reader (read path — constitution §10).
 *
 * Reads tenant-scoped FeatureFlag entities at request time. Usable in both
 * Next.js route handlers and React Server Components (both run server-side).
 *
 * Writes go through the canonical Manifest command dispatcher
 * (POST /api/manifest/FeatureFlag/commands/{create,enable,disable,setRollout});
 * this module ONLY reads and must not mutate governed state.
 *
 * Persistence: FeatureFlag has no dedicated Prisma model — the Manifest runtime
 * routes it to PrismaJsonStore, the shared `manifest_entity` JSON-blob table.
 * So we read it the same way the store writes it.
 */

const ENTITY_TYPE = "FeatureFlag";

export interface FeatureFlag {
  enabled: boolean;
  flagKey: string;
  rolloutPercent: number;
}

/** Minimal Prisma surface needed to read flags — lets callers/tests inject a client. */
interface FlagReadClient {
  manifestEntity: {
    findMany: (args: {
      where: { tenantId: string; entityType: string };
      orderBy?: { createdAt: "asc" | "desc" };
    }) => Promise<Array<{ id: string; data: unknown; createdAt?: Date }>>;
  };
}

function coerce(data: unknown): FeatureFlag | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const row = data as Record<string, unknown>;
  if (typeof row.flagKey !== "string" || row.flagKey === "") {
    return null;
  }
  if (row.deletedAt != null) {
    return null; // soft-deleted
  }
  return {
    flagKey: row.flagKey,
    enabled: row.enabled === true,
    rolloutPercent:
      typeof row.rolloutPercent === "number" ? row.rolloutPercent : 0,
  };
}

/**
 * Read all active (non-soft-deleted) feature flags for a tenant, keyed by
 * flagKey. On duplicate flagKeys the most recently created row wins.
 */
export async function flags(
  tenantId: string,
  client?: FlagReadClient
): Promise<Record<string, FeatureFlag>> {
  if (!tenantId) {
    return {};
  }
  // Lazily resolve the shared server client so importing this module does not
  // require DATABASE_URL (keeps it testable with an injected client).
  const db =
    client ??
    ((await import("../index")).database as unknown as FlagReadClient);
  const rows = await db.manifestEntity.findMany({
    where: { tenantId, entityType: ENTITY_TYPE },
    orderBy: { createdAt: "asc" },
  });
  const result: Record<string, FeatureFlag> = {};
  for (const row of rows) {
    const flag = coerce(row.data);
    if (flag) {
      result[flag.flagKey] = flag; // later (newer) rows overwrite earlier ones
    }
  }
  return result;
}

/**
 * Deterministic 0–99 bucket for percentage rollout. Stable across requests so a
 * given (flagKey, bucketKey) stays on the same side of the rollout threshold.
 */
function bucket(flagKey: string, bucketKey: string): number {
  let hash = 0;
  const input = `${flagKey}:${bucketKey}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1_000_000_007;
  }
  return hash % 100;
}

/**
 * Whether a flag is on. `bucketKey` (e.g. a userId) enables percentage bucketing.
 *
 * ponytail: per-tenant flag. With a bucketKey, an enabled flag is on when the
 * stable bucket falls under rolloutPercent. Without one we can't bucket, so an
 * enabled flag with any rollout > 0 counts as on (rolloutPercent 0 = off).
 */
export function isFlagEnabled(
  flag: FeatureFlag | undefined,
  bucketKey?: string
): boolean {
  if (!flag?.enabled) {
    return false;
  }
  if (flag.rolloutPercent >= 100) {
    return true;
  }
  if (flag.rolloutPercent <= 0) {
    return false;
  }
  if (bucketKey) {
    return bucket(flag.flagKey, bucketKey) < flag.rolloutPercent;
  }
  return true;
}
