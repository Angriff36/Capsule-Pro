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
 * `entityType`.  Falls back to `"deletedAt"` when no override is registered.
 */
export function getDeletedAtField(entityType: string): string {
  const overrides: Record<string, Record<string, string | null>> = {
    Document: { deletedAt: "deleted_at" },
    SmsAutomationRule: { deletedAt: "deleted_at" },
    StorageLocation: { deletedAt: "deleted_at" },
    BulkCombineRule: { deletedAt: "deleted_at" },
    MethodVideo: { deletedAt: "deleted_at" },
    PrepListImport: { deletedAt: "deleted_at" },
    TaskBundle: { deletedAt: "deleted_at" },
    TaskBundleItem: { deletedAt: "deleted_at" },
    OpenShift: { deletedAt: "deleted_at" },
  };

  return overrides[entityType]?.deletedAt ?? "deletedAt";
}
