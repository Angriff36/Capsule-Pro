var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const database_1 = require("@repo/database");
const realtime_1 = require("@repo/realtime");
const ably_1 = __importDefault(require("ably"));
const env_1 = require("@/env");
// Payload size limits (Ably max is ~64 KiB on most plans)
const WARN_PAYLOAD_SIZE = 32 * 1024; // 32 KiB
const MAX_PAYLOAD_SIZE = 64 * 1024; // 64 KiB
const parseLimit = (payload) => {
  if (!payload?.limit) {
    return 100;
  }
  return Math.max(1, Math.min(500, payload.limit));
};
const isAuthorized = (authorization) => {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 && token === env_1.env.OUTBOX_PUBLISH_TOKEN;
};
/**
 * Build the full realtime event envelope for Ably publishing.
 * Includes id, version, tenantId, aggregateType, aggregateId, occurredAt.
 */
function buildEventEnvelope(outboxEvent) {
  // Extract occurredAt from payload if present (set by producer), otherwise use createdAt
  const payloadData = outboxEvent.payload;
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
function getMessageSize(message) {
  return Buffer.byteLength(JSON.stringify(message), "utf8");
}
async function POST(request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const payload = await request.json().catch(() => null);
  const limit = parseLimit(payload);
  // Get oldest pending event age for monitoring
  const oldestPending = await database_1.database.outboxEvent.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const oldestPendingSeconds = oldestPending
    ? (Date.now() - oldestPending.createdAt.getTime()) / 1000
    : 0;
  // Use SKIP LOCKED for concurrent publisher safety
  // Prisma doesn't expose SKIP LOCKED, so we use $queryRaw
  const pendingEvents = await database_1.database.$queryRaw`
    SELECT "id", "tenantId", "aggregateType", "aggregateId", "eventType", "payload",
           "status", "error", "createdAt", "publishedAt"
    FROM "OutboxEvent"
    WHERE "status" = 'pending'
    ORDER BY "createdAt" ASC
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  `;
  if (pendingEvents.length === 0) {
    return Response.json({
      published: 0,
      failed: 0,
      skipped: 0,
      oldestPendingSeconds,
    });
  }
  const ably = new ably_1.default.Rest(env_1.env.ABLY_API_KEY);
  let published = 0;
  let failed = 0;
  let skipped = 0;
  for (const event of pendingEvents) {
    // Double-check status (another publisher may have processed it)
    if (event.status !== "pending") {
      skipped += 1;
      continue;
    }
    const envelope = buildEventEnvelope(event);
    const messageSize = getMessageSize(envelope);
    // Check payload size limits
    if (messageSize > MAX_PAYLOAD_SIZE) {
      await database_1.database.outboxEvent.update({
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
      // Log warning but continue publishing
      console.warn(
        `[OutboxPublisher] Large payload for event ${event.id}: ${messageSize} bytes`
      );
    }
    const channelName = (0, realtime_1.getChannelName)(event.tenantId);
    const channel = ably.channels.get(channelName);
    try {
      await channel.publish(event.eventType, envelope);
      await database_1.database.outboxEvent.update({
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
      await database_1.database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          error: `ABLY_ERROR: ${message}`,
        },
      });
      failed += 1;
    }
  }
  return Response.json({
    published,
    failed,
    skipped,
    oldestPendingSeconds,
  });
}
