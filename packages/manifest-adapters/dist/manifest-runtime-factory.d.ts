/**
 * Shared manifest runtime factory.
 *
 * This is the ONE canonical implementation of `createManifestRuntime`.
 * Both `apps/api` and `apps/app` use this factory — the only difference
 * is which concrete singletons they inject for prisma, logging, telemetry,
 * and error capture.
 *
 * This module must NOT import:
 *   - `@repo/database`  (injected as deps.prisma)
 *   - `@sentry/nextjs`  (injected as deps.captureException)
 *   - `@repo/observability/log` (injected as deps.log)
 *
 * @packageDocumentation
 */
import type { CommandResult, RuntimeEngine } from "@angriff36/manifest";
import type { IRCommand } from "@angriff36/manifest/ir";
/**
 * Base Prisma interface for operations used by the manifest runtime.
 * Works with both full PrismaClient and transaction clients.
 */
interface PrismaBase {
    user: {
        findFirst: (args: {
            where: {
                id: string;
                tenantId: string;
                deletedAt: null;
            };
            select: {
                role: true;
            };
        }) => Promise<{
            role: string | null;
        } | null>;
    };
}
/**
 * Minimal structural type for the full Prisma client.
 * Includes $transaction for outbox writes when no override is provided.
 */
export interface PrismaLike extends PrismaBase {
    $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
}
/**
 * Type for transaction client passed as prismaOverride.
 * Transaction clients omit $transaction since nesting is not allowed.
 */
export type PrismaTransactionClient = PrismaBase;
/** Minimal structured logger the factory needs. */
export interface ManifestRuntimeLogger {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
}
/**
 * Telemetry hooks wired into the runtime engine context.
 *
 * Uses method syntax (not function-property syntax) so that callers can
 * inject implementations with narrower parameter types without tripping
 * `strictFunctionTypes` contravariance checks.
 */
export interface ManifestTelemetryHooks {
    onConstraintEvaluated?(outcome: unknown, commandName: string, entityName?: string): void;
    onOverrideApplied?(constraint: unknown, overrideReq: unknown, outcome: unknown, commandName: string): void;
    onCommandExecuted?(command: Readonly<IRCommand>, result: Readonly<CommandResult>, entityName?: string): void | Promise<void>;
}
/** Dependencies injected by the calling app. */
export interface CreateManifestRuntimeDeps {
    /** Prisma client instance (the app's singleton). */
    prisma: PrismaLike;
    /**
     * Optional Prisma override for transaction-aware operations.
     * When provided (typically a transaction client from $transaction callback),
     * ALL internal Prisma operations use this client instead of `prisma`.
     * This enables atomic multi-entity writes in composite routes.
     */
    prismaOverride?: PrismaTransactionClient;
    /** Structured logger. */
    log: ManifestRuntimeLogger;
    /** Error capture function (e.g. Sentry.captureException). Returns event id. */
    captureException: (err: unknown, context?: any) => unknown;
    /** Telemetry hooks for observability. */
    telemetry?: ManifestTelemetryHooks;
    /** Idempotency configuration (Phase 2: failureTtlMs plumbing). */
    idempotency?: {
        failureTtlMs?: number;
    };
}
/** Context passed by the caller describing the acting user. */
export interface ManifestRuntimeContext {
    user: {
        id: string;
        tenantId: string;
        role?: string;
    };
    entityName?: string;
}
/**
 * Create a manifest runtime with Prisma-based storage and transactional outbox.
 *
 * This is the single canonical factory. Both `apps/api` and `apps/app` call
 * this function — the only difference is which concrete singletons they inject.
 *
 * @example
 * ```typescript
 * // In apps/api (thin shim):
 * import { createManifestRuntime as createShared } from "@repo/manifest-adapters/manifest-runtime-factory";
 * import { database } from "@repo/database";
 * import { log } from "@repo/observability/log";
 * import { captureException } from "@sentry/nextjs";
 *
 * export function createManifestRuntime(ctx) {
 *   return createShared(
 *     { prisma: database, log, captureException, telemetry: sentryTelemetry },
 *     ctx,
 *   );
 * }
 * ```
 */
export declare function createManifestRuntime(deps: CreateManifestRuntimeDeps, ctx: ManifestRuntimeContext): Promise<RuntimeEngine>;
export type { RuntimeEngine } from "@angriff36/manifest";
//# sourceMappingURL=manifest-runtime-factory.d.ts.map