import { database } from "@repo/database";
import { getChannelName, type RealtimeEventBase } from "@repo/realtime";
import { publish as publishToChannel } from "@/lib/realtime/pubsub";
import { env } from "@/env";

interface PublishRequest {
  limit?: number;
}

// Payload size limits — Ably's previous 64 KiB ceiling is gone but oversized
// payloads still bloat the SSE stream, so keep the same guardrails.
const WARN_PAYLOAD_SIZE = 32 * 1024; // 32 KiB
const MAX_PAYLOAD_SIZE = 64 * 1024; // 64 KiB

const parseLimit = (payload: PublishRequest | null) => {
  if (!payload?.limit) {
    return 100;
  }
  return Math.max(1, Math.min(500, payload.limit));
};

const isAuthorized = (authorization: string | null) => {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 && token === env.OUTBOX_PUBLISH_TOKEN;
};

/**
 * Build the full realtime event envelope for SSE fanout.
 * Includes id, version, tenantId, aggregateType, aggregateId, occurredAt.
 */
function buildEventEnvelope(outboxEvent: {
  id: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  createdAt: Date;
}): RealtimeEventBase & { eventType: string; payload: unknown } {
  // Extract occurredAt from payload if present (set by producer), otherwise use createdAt
  const payloadData = outboxEvent.payload as
    | Record<string, unknown>
    | undefined;
  const occurredAt =
    payloadData?.occurredAt && typeof payloadData.occurredAt === "string"
      ? payloadData.occurredAt
      : outboxEvent.createdAt.toISOString();

  return {
    id: outboxEvent.id,
    version: 1,
    tenantId: outboxEvent.tenantId,
    aggregateType: outboxEvent.aggregateType,
    aggregateId: outboxEvent.aggregateId,
    occurredAt,
    eventType: outboxEvent.eventType,
    payload: outboxEvent.payload,
  };
}

/**
 * Calculate the serialized size of a message in bytes.
 */
function getMessageSize(message: unknown): number {
  return Buffer.byteLength(JSON.stringify(message), "utf8");
}

/**
 * Raw OutboxEvent type for $queryRaw results.
 * Prisma doesn't expose SKIP LOCKED, so we use raw SQL.
 */
interface RawOutboxEvent {
  id: string;
  tenant_id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: unknown;
  status: string;
  error: string | null;
  created_at: Date;
  published_at: Date | null;
}

interface PublishOutcome {
  published: number;
  failed: number;
  skipped: number;
  oldestPendingSeconds: number;
}

async function runPublishLoop(limit: number): Promise<PublishOutcome> {
  // Get oldest pending event age for monitoring
  const oldestPending = await database.outboxEvent.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const oldestPendingSeconds = oldestPending
    ? (Date.now() - oldestPending.createdAt.getTime()) / 1000
    : 0;

  // Use SKIP LOCKED for concurrent publisher safety
  // Prisma doesn't expose SKIP LOCKED, so we use $queryRaw
  const pendingEvents = await database.$queryRaw<RawOutboxEvent[]>`
    SELECT "id", "tenant_id", "aggregate_type", "aggregate_id", "event_type", "payload",
           "status", "error", "created_at", "published_at"
    FROM "tenant"."OutboxEvent"
    WHERE "status" = 'pending'
    ORDER BY "created_at" ASC
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  `;

  if (pendingEvents.length === 0) {
    return { published: 0, failed: 0, skipped: 0, oldestPendingSeconds };
  }

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of pendingEvents) {
    // Double-check status (another publisher may have processed it)
    if (event.status !== "pending") {
      skipped += 1;
      continue;
    }

    const envelope = buildEventEnvelope({
      id: event.id,
      tenantId: event.tenant_id,
      aggregateType: event.aggregate_type,
      aggregateId: event.aggregate_id,
      eventType: event.event_type,
      payload: event.payload,
      createdAt: event.created_at,
    });
    const messageSize = getMessageSize(envelope);

    // Check payload size limits
    if (messageSize > MAX_PAYLOAD_SIZE) {
      await database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          error: `PAYLOAD_TOO_LARGE: ${messageSize} bytes (max ${MAX_PAYLOAD_SIZE})`,
        },
      });
      failed += 1;
      continue;
    }

    if (messageSize > WARN_PAYLOAD_SIZE) {
      console.warn(
        `[OutboxPublisher] Large payload for event ${event.id}: ${messageSize} bytes`
      );
    }

    const channelName = getChannelName(event.tenant_id);

    try {
      // In-process fanout to any SSE subscribers currently connected to this
      // tenant's channel. Listeners with no subscribers just no-op — the
      // event is still marked `published` because the persisted outbox row
      // is the system of record, not the live fanout.
      publishToChannel(channelName, {
        name: event.event_type,
        data: envelope,
      });
      await database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          error: null,
        },
      });
      published += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown publish error";
      try {
        await database.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "failed",
            error: `PUBLISH_ERROR: ${message}`,
          },
        });
      } catch {
        // Event may have been deleted, ignore update error
      }
      failed += 1;
    }
  }

  return { published, failed, skipped, oldestPendingSeconds };
}

/**
 * GET /outbox/publish
 * Vercel Cron sends GET requests. Uses default limit (100).
 */
export async function GET(request: Request) {
  // Accept Vercel cron header as auth alternative
  const vercelCron = request.headers.get("x-vercel-cron");
  if (
    vercelCron !== "1" &&
    !isAuthorized(request.headers.get("authorization"))
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const outcome = await runPublishLoop(100);
  return Response.json(outcome);
}

export async function POST(request: Request) {
  // Accept Vercel cron header as auth alternative (Vercel Cron sends x-vercel-cron: 1)
  const vercelCron = request.headers.get("x-vercel-cron");
  if (
    vercelCron !== "1" &&
    !isAuthorized(request.headers.get("authorization"))
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request
    .json()
    .catch(() => null)) as PublishRequest | null;
  const outcome = await runPublishLoop(parseLimit(payload));
  return Response.json(outcome);
}
