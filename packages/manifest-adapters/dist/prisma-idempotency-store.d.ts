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
import type { PrismaClient } from "@repo/database/standalone";
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
export declare class PrismaIdempotencyStore implements IdempotencyStore {
    private readonly prisma;
    private readonly tenantId;
    private readonly ttlMs;
    constructor(config: PrismaIdempotencyStoreConfig);
    /**
     * Check if a command with this key has already been executed.
     * Returns false if the entry has expired.
     */
    has(key: string): Promise<boolean>;
    /**
     * Record a command result for an idempotency key.
     * Uses upsert to handle concurrent requests gracefully.
     */
    set(key: string, result: CommandResult): Promise<void>;
    /**
     * Retrieve the cached result for an idempotency key.
     * Returns undefined if not found or expired.
     */
    get(key: string): Promise<CommandResult | undefined>;
}
/**
 * Factory function to create a PrismaIdempotencyStore.
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @param ttlMs - TTL in milliseconds (default: 24 hours)
 */
export declare function createPrismaIdempotencyStore(prisma: PrismaClient, tenantId: string, ttlMs?: number): PrismaIdempotencyStore;
/**
 * Delete expired idempotency entries across all tenants.
 *
 * Returns the number of deleted rows.
 */
export declare function cleanupExpiredIdempotencyEntries(prisma: PrismaClient): Promise<number>;
export {};
//# sourceMappingURL=prisma-idempotency-store.d.ts.map