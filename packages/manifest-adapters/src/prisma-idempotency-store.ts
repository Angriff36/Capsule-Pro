/**
 * Prisma-backed idempotency store for Manifest command deduplication.
 *
 * This module implements the IdempotencyStore interface using the
 * ManifestIdempotency table. It ensures that retried commands with
 * the same idempotency key return the same result without re-executing.
 *
 * Features:
 * - Tenant-scoped idempotency keys
 * - Configurable TTL (default: 24 hours)
 * - Automatic cleanup of expired entries
 * - Optimistic concurrency for concurrent requests with same key
 *
 * @packageDocumentation
 */

import type { CommandResult, IdempotencyStore } from "@angriff36/manifest";
import type { Prisma, PrismaClient } from "@repo/database";

/**
 * Configuration for PrismaIdempotencyStore.
 */
interface PrismaIdempotencyStoreConfig {
  /** Prisma client instance */
  prisma: PrismaClient;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** TTL in milliseconds for idempotency entries (default: 24 hours) */
  ttlMs?: number;
}

/** Default TTL: 24 hours */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Prisma-backed idempotency store.
 *
 * Stores command results keyed by (tenantId, idempotencyKey) in the
 * ManifestIdempotency table. When a command is retried with the same
 * key, the cached result is returned without re-execution.
 *
 * @example
 * ```typescript
 * const idempotencyStore = new PrismaIdempotencyStore({
 *   prisma: database,
 *   tenantId: "tenant-123",
 *   ttlMs: 24 * 60 * 60 * 1000, // 24 hours
 * });
 *
 * // Wire into manifest runtime options
 * const runtime = new ManifestRuntimeEngine(ir, context, {
 *   storeProvider,
 *   idempotencyStore,
 * });
 * ```
 */
export class PrismaIdempotencyStore implements IdempotencyStore {
  private readonly prisma: PrismaClient;
  private readonly tenantId: string;
  private readonly ttlMs: number;

  constructor(config: PrismaIdempotencyStoreConfig) {
    this.prisma = config.prisma;
    this.tenantId = config.tenantId;
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
  }

  /**
   * Check if a command with this key has already been executed.
   * Returns false if the entry has expired.
   */
  async has(key: string): Promise<boolean> {
    try {
      const entry = await this.prisma.manifestIdempotency.findUnique({
        where: {
          tenantId_key: {
            tenantId: this.tenantId,
            key,
          },
        },
      });

      if (!entry) {
        return false;
      }

      // Check if expired
      if (entry.expiresAt < new Date()) {
        // Clean up expired entry
        await this.prisma.manifestIdempotency
          .delete({
            where: {
              tenantId_key: {
                tenantId: this.tenantId,
                key,
              },
            },
          })
          .catch(() => {
            // Ignore delete errors (concurrent cleanup)
          });
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        `[PrismaIdempotencyStore] has("${key}") failed for tenant="${this.tenantId}":`,
        error
      );
      // On error, return false to allow the command to proceed
      // (fail-open for availability)
      return false;
    }
  }

  /**
   * Record a command result for an idempotency key.
   * Uses upsert to handle concurrent requests gracefully.
   */
  async set(key: string, result: CommandResult): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.ttlMs);

      await this.prisma.manifestIdempotency.upsert({
        where: {
          tenantId_key: {
            tenantId: this.tenantId,
            key,
          },
        },
        create: {
          tenantId: this.tenantId,
          key,
          result: result as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
        update: {
          result: result as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
      });
    } catch (error) {
      console.error(
        `[PrismaIdempotencyStore] set("${key}") failed for tenant="${this.tenantId}":`,
        error
      );
      // Don't throw — idempotency is a best-effort optimization.
      // The command already executed successfully; failing to cache
      // the result just means the next retry will re-execute.
    }
  }

  /**
   * Retrieve the cached result for an idempotency key.
   * Returns undefined if not found or expired.
   */
  async get(key: string): Promise<CommandResult | undefined> {
    try {
      const entry = await this.prisma.manifestIdempotency.findUnique({
        where: {
          tenantId_key: {
            tenantId: this.tenantId,
            key,
          },
        },
      });

      if (!entry) {
        return undefined;
      }

      // Check if expired
      if (entry.expiresAt < new Date()) {
        // Clean up expired entry (fire-and-forget)
        this.prisma.manifestIdempotency
          .delete({
            where: {
              tenantId_key: {
                tenantId: this.tenantId,
                key,
              },
            },
          })
          .catch(() => {
            // Ignore delete errors (concurrent cleanup)
          });
        return undefined;
      }

      return entry.result as unknown as CommandResult;
    } catch (error) {
      console.error(
        `[PrismaIdempotencyStore] get("${key}") failed for tenant="${this.tenantId}":`,
        error
      );
      // On error, return undefined to allow the command to proceed
      return undefined;
    }
  }
}

/**
 * Factory function to create a PrismaIdempotencyStore.
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @param ttlMs - TTL in milliseconds (default: 24 hours)
 */
export function createPrismaIdempotencyStore(
  prisma: PrismaClient,
  tenantId: string,
  ttlMs?: number
): PrismaIdempotencyStore {
  return new PrismaIdempotencyStore({ prisma, tenantId, ttlMs });
}

/**
 * Delete expired idempotency entries across all tenants.
 *
 * Returns the number of deleted rows.
 */
export async function cleanupExpiredIdempotencyEntries(
  prisma: PrismaClient
): Promise<number> {
  const result = await prisma.manifestIdempotency.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
