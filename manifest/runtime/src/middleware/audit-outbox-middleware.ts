/**
 * Audit/Outbox Middleware for Manifest Command Execution
 *
 * Replaces the outbox event persistence logic that was previously embedded
 * in the factory's telemetry hooks. Runs as an `after-emit` middleware inside
 * the Manifest engine lifecycle, ensuring events are written to the outbox
 * before the command result is returned.
 *
 * Why middleware instead of telemetry hooks:
 * - Runs INSIDE the engine lifecycle (not after it via runCommand override)
 * - Composable with other middleware (RBAC, identity)
 * - Direct access to emittedEvents from the lifecycle context
 * - Transaction context captured via closure (prismaOverride support)
 *
 * @packageDocumentation
 */

import type {
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
} from "@angriff36/manifest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Prisma client subset needed for outbox writes. */
interface PrismaForOutbox {
  $transaction: (fn: (tx: any) => Promise<void>) => Promise<void>;
}

/** Logger subset needed for error reporting. */
interface AuditLogger {
  error: (message: string, meta?: { error: unknown }) => void;
}

/** Error capture function (e.g. Sentry captureException). */
type CaptureException = (error: unknown) => void;

export interface AuditMiddlewareOptions {
  /** Prisma client for outbox writes (used when no prismaOverride is available). */
  prisma: PrismaForOutbox;
  /** Transaction client from the request scope (null when not in a composite route). */
  prismaOverride: any | null;
  /** Tenant ID for outbox event scoping. */
  tenantId: string;
  /** Logger for error reporting. */
  log: AuditLogger;
  /** Error capture function (e.g. Sentry). */
  captureException: CaptureException;
  /** Factory function for creating the outbox writer. */
  createOutboxWriter: (
    entityName: string,
    tenantId: string
  ) => (prisma: any, events: Array<OutboxEvent>) => Promise<void>;
}

/** Shape of an outbox event for persistence. */
interface OutboxEvent {
  eventType: string;
  payload: unknown;
  aggregateType: string;
  aggregateId: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an audit/outbox middleware that persists emitted events.
 *
 * Fires at the `after-emit` lifecycle hook — after all declared events have
 * been emitted by the engine. The middleware writes events to the outbox_events
 * table for reliable downstream processing.
 *
 * Transaction handling:
 * - When prismaOverride is provided (composite route transaction), writes
 *   directly to the override client (already in a transaction).
 * - Otherwise, creates a new transaction for atomic outbox writes.
 */
export function createAuditOutboxMiddleware(
  options: AuditMiddlewareOptions
): Middleware {
  const {
    prisma,
    prismaOverride,
    tenantId,
    log,
    captureException,
    createOutboxWriter,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Only write if there are events to persist.
      if (!ctx.emittedEvents || ctx.emittedEvents.length === 0) {
        return {};
      }

      const entityName = ctx.entityName || "unknown";
      const outboxWriter = createOutboxWriter(entityName, tenantId);

      // Transform emitted events to outbox format.
      // Use event.subject metadata (Manifest >= 1.6.0) for aggregate identification,
      // falling back to the middleware context's instanceId.
      const eventsToWrite: OutboxEvent[] = ctx.emittedEvents.map((event) => ({
        eventType: event.name || "unknown",
        payload: event.payload,
        aggregateType:
          (event as any).subject?.entity || entityName,
        aggregateId:
          (event as any).subject?.id || ctx.instanceId || "unknown",
      }));

      try {
        if (prismaOverride) {
          // Already in a composite route transaction — write directly.
          // biome-ignore lint/suspicious/noExplicitAny: outboxWriter expects PrismaClient; prismaOverride is structurally compatible.
          await outboxWriter(prismaOverride as any, eventsToWrite);
        } else {
          // Create a new transaction for atomic outbox writes.
          await prisma.$transaction(async (tx) => {
            // biome-ignore lint/suspicious/noExplicitAny: outboxWriter expects PrismaClient; tx is structurally compatible.
            await outboxWriter(tx as any, eventsToWrite);
          });
        }
      } catch (error) {
        log.error("[manifest-runtime] Failed to write events to outbox", {
          error,
        });
        captureException(error);
        // Re-throw to surface the error in the command result.
        throw error;
      }

      return {};
    },
  };
}
