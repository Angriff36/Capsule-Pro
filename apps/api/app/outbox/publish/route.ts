import Ably from "ably";
import { database } from "@repo/database";
import { env } from "@/env";

type PublishRequest = {
  limit?: number;
};

const parseLimit = (payload: PublishRequest | null) => {
  if (!payload?.limit) return 100;
  return Math.max(1, Math.min(500, payload.limit));
};

const isAuthorized = (authorization: string | null) => {
  if (!authorization?.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 && token === env.OUTBOX_PUBLISH_TOKEN;
};

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as PublishRequest | null;
  const limit = parseLimit(payload);

  const pendingEvents = await database.outboxEvent.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  if (pendingEvents.length === 0) {
    return Response.json({ published: 0, failed: 0 });
  }

  const ably = new Ably.Rest(env.ABLY_API_KEY);
  let published = 0;
  let failed = 0;

  for (const event of pendingEvents) {
    const channel = ably.channels.get(`tenant:${event.tenantId}`);
    try {
      await channel.publish(event.eventType, event.payload);
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
      await database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          error: message,
        },
      });
      failed += 1;
    }
  }

  return Response.json({ published, failed });
}
