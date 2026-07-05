/**
 * Shared helpers for trash route handlers.
 *
 * Centralises Prisma-delegate resolution and field-name lookups so that every
 * trash route can use typed calls instead of `as any` casts.
 */

import { resolveEntityAccessor } from "@/lib/manifest/entity-accessor";

// ─────────────────────────────────────────────────────────────
// Prisma delegate interface (only the methods the trash module uses)
// ─────────────────────────────────────────────────────────────

export interface PrismaDelegate {
  count(args?: object): Promise<number>;
  delete(args?: object): Promise<unknown>;
  findFirst(args?: object): Promise<unknown>;
  findMany(args?: object): Promise<unknown[]>;
  update(args?: object): Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────
// Delegate resolver
// ─────────────────────────────────────────────────────────────

/**
 * Return the Prisma delegate for the given entity type, or `null` if the
 * entity has no backing table (drop / non-existent).
 *
 * This is the single cast point — callers never touch `as any`.
 */
export function getPrismaDelegate(
  entityType: string,
  db: unknown
): PrismaDelegate | null {
  const resolution = resolveEntityAccessor(entityType);

  if (resolution.drop || !resolution.exists) {
    return null;
  }

  const delegate = (db as Record<string, PrismaDelegate>)[resolution.accessor];

  return delegate ?? null;
}

// ─────────────────────────────────────────────────────────────
// Field-name helpers
// ─────────────────────────────────────────────────────────────

/**
 * Return the correct Prisma field name for the tenant FK of `entityType`.
 * Handles snake_case models that use `tenant_id` instead of `tenantId`.
 */
export function getTenantField(entityType: string): string {
  return resolveEntityAccessor(entityType).tenantIdField;
}

/**
 * Return the correct Prisma field name for the soft-delete timestamp of
 * `entityType`.
 *
 * Every soft-deletable model in the current schema exposes the camelCase
 * Prisma field `deletedAt` (mapped to the `deleted_at` column). The former
 * per-model `deleted_at` snake overrides were stale — they named the DB column
 * instead of the Prisma field, which Prisma rejects — and several referenced
 * models (BulkCombineRule, MethodVideo, OpenShift, PrepListImport, TaskBundle,
 * TaskBundleItem) have no soft-delete column at all.
 */
export function getDeletedAtField(_entityType: string): string {
  return "deletedAt";
}
